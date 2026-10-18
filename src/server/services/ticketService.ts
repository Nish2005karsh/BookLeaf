import { ticketRepository, TicketFilterOptions } from "../repositories/ticketRepository";
import { bookRepository } from "../repositories/bookRepository";
import { AuthenticatedUser } from "@/lib/auth/guards";
import { NotFoundError, ConflictError, ValidationError } from "@/lib/http/errors";
import { calculateUrgencyScore } from "@/lib/tickets/urgency";
import { processTicketClassification } from "@/lib/ai/classify";
import {
  TicketStatus,
  Category,
  Priority,
  MessageSender,
  AiState,
} from "@prisma/client";

export const ticketService = {
  /**
   * Serializes a ticket for an Author:
   * Strictly filters out AI triage fields, category, priority, notes, and drafts.
   */
  serializeForAuthor(ticket: any) {
    if (!ticket) return null;
    return {
      id: ticket.id,
      number: ticket.number,
      subject: ticket.subject,
      description: ticket.description,
      status: ticket.status,
      attachmentNames: ticket.attachmentNames,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      firstRespondedAt: ticket.firstRespondedAt,
      resolvedAt: ticket.resolvedAt,
      book: ticket.book
        ? {
            id: ticket.book.id,
            title: ticket.book.title,
            externalId: ticket.book.externalId,
            status: ticket.book.status,
          }
        : null,
      messages: ticket.messages
        ? ticket.messages.map((m: any) => ({
            id: m.id,
            sender: m.sender,
            authorName: m.authorUser?.name || "Support",
            body: m.body,
            createdAt: m.createdAt,
          }))
        : [],
    };
  },

  /**
   * Serializes a ticket for an Admin:
   * Includes internal notes, AI analysis, drafts, and override audit data.
   */
  serializeForAdmin(ticket: any) {
    if (!ticket) return null;
    const urgencyScore = calculateUrgencyScore({
      status: ticket.status,
      priority: ticket.priority,
      createdAt: ticket.createdAt,
    });

    return {
      ...ticket,
      urgencyScore,
      author: ticket.author
        ? {
            id: ticket.author.id,
            name: ticket.author.name,
            email: ticket.author.email,
            phone: ticket.author.phone,
            city: ticket.author.city,
            joinedAt: ticket.author.joinedAt,
          }
        : null,
    };
  },

  async createTicket(
    data: {
      subject: string;
      description: string;
      bookId?: string | null;
      attachmentNames?: string[];
    },
    user: AuthenticatedUser
  ) {
    // If bookId is supplied, verify it belongs to this author
    if (data.bookId) {
      const book = await bookRepository.findById(data.bookId);
      if (!book || book.authorId !== user.userId) {
        throw new ValidationError("Invalid book selected for your account");
      }
    }

    const ticket = await ticketRepository.create({
      authorId: user.userId,
      bookId: data.bookId,
      subject: data.subject,
      description: data.description,
      attachmentNames: data.attachmentNames,
    });

    // Asynchronously trigger AI classification (fire-and-forget)
    processTicketClassification(ticket.id).catch((err) => {
      console.error("[TicketService] Asynchronous classification failed:", err);
    });

    return ticket;
  },

  async getTicketById(id: string, user: AuthenticatedUser) {
    const ticket = await ticketRepository.findById(id);

    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    if (user.role === "AUTHOR") {
      // Authors only access their own tickets; return 404 (not 403) to prevent leaking existence
      if (ticket.authorId !== user.userId) {
        throw new NotFoundError("Ticket not found");
      }
      return this.serializeForAuthor(ticket);
    }

    return this.serializeForAdmin(ticket);
  },

  async listTickets(
    user: AuthenticatedUser,
    filters: TicketFilterOptions & { sort?: "urgency" | "newest" | "oldest" },
    pagination: { page?: number; pageSize?: number } = { page: 1, pageSize: 50 }
  ) {
    const page = Math.max(1, pagination.page || 1);
    const pageSize = Math.min(100, Math.max(1, pagination.pageSize || 50));
    const skip = (page - 1) * pageSize;

    if (user.role === "AUTHOR") {
      // Author forced filter
      const result = await ticketRepository.findMany(
        { authorId: user.userId, updatedSince: filters.updatedSince },
        { skip, take: pageSize }
      );

      return {
        tickets: result.tickets.map((t) => this.serializeForAuthor(t)),
        total: result.total,
        page,
        pageSize,
      };
    }

    // Admin list
    const result = await ticketRepository.findMany(filters, { skip, take: pageSize });
    let serialized = result.tickets.map((t) => this.serializeForAdmin(t));

    // Sort options
    if (filters.sort === "urgency" || !filters.sort) {
      serialized.sort((a, b) => (b.urgencyScore || 0) - (a.urgencyScore || 0));
    } else if (filters.sort === "oldest") {
      serialized.sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    } else if (filters.sort === "newest") {
      serialized.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }

    return {
      tickets: serialized,
      total: result.total,
      page,
      pageSize,
    };
  },

  async addMessage(
    ticketId: string,
    body: string,
    user: AuthenticatedUser
  ) {
    const ticket = await ticketRepository.findById(ticketId);

    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    if (user.role === "AUTHOR" && ticket.authorId !== user.userId) {
      throw new NotFoundError("Ticket not found");
    }

    // Closed tickets reject new messages
    if (ticket.status === TicketStatus.CLOSED) {
      throw new ConflictError("This ticket is closed. Please submit a new ticket for any new queries.");
    }

    const sender = user.role === "ADMIN" ? MessageSender.ADMIN : MessageSender.AUTHOR;

    const message = await ticketRepository.addMessage({
      ticketId,
      sender,
      authorUserId: user.userId,
      body,
    });

    const updateData: any = { updatedAt: new Date() };

    // Business rule: Author follow-up on RESOLVED reopens it (-> OPEN)
    if (user.role === "AUTHOR" && ticket.status === TicketStatus.RESOLVED) {
      updateData.status = TicketStatus.OPEN;
      updateData.resolvedAt = null;
    }

    // Business rule: Admin response moves OPEN -> IN_PROGRESS and tracks first response
    if (user.role === "ADMIN") {
      if (!ticket.firstRespondedAt) {
        updateData.firstRespondedAt = new Date();
      }
      if (ticket.status === TicketStatus.OPEN) {
        updateData.status = TicketStatus.IN_PROGRESS;
      }
    }

    // Invalidate cached draft if new author message arrives
    if (user.role === "AUTHOR") {
      updateData.draftResponse = null;
      updateData.draftGeneratedAt = null;
    }

    await ticketRepository.update(ticketId, updateData);

    return message;
  },

  async addInternalNote(ticketId: string, body: string, user: AuthenticatedUser) {
    if (user.role !== "ADMIN") {
      throw new NotFoundError("Ticket not found");
    }

    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    return ticketRepository.addInternalNote({
      ticketId,
      adminId: user.userId,
      body,
    });
  },

  async updateTicketAdmin(
    ticketId: string,
    data: {
      status?: TicketStatus;
      category?: Category;
      priority?: Priority;
      assignedToId?: string | null;
    },
    admin: AuthenticatedUser
  ) {
    const ticket = await ticketRepository.findById(ticketId);
    if (!ticket) {
      throw new NotFoundError("Ticket not found");
    }

    const updateData: any = {};

    if (data.status) {
      updateData.status = data.status;
      if (data.status === TicketStatus.RESOLVED && !ticket.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
      if (data.status !== TicketStatus.RESOLVED) {
        updateData.resolvedAt = null;
      }
    }

    if (data.category) {
      updateData.category = data.category;
      if (data.category !== ticket.category) {
        updateData.categoryOverriddenById = admin.userId;
      }
    }

    if (data.priority) {
      updateData.priority = data.priority;
      if (data.priority !== ticket.priority) {
        updateData.priorityOverriddenById = admin.userId;
      }
    }

    if (data.assignedToId !== undefined) {
      updateData.assignedToId = data.assignedToId;
    }

    const updated = await ticketRepository.update(ticketId, updateData);
    return this.serializeForAdmin(updated);
  },

  async assignToAdmin(ticketId: string, admin: AuthenticatedUser) {
    return this.updateTicketAdmin(ticketId, { assignedToId: admin.userId }, admin);
  },

  async getAdminStats() {
    return ticketRepository.getAdminStats();
  },
};
