import { prisma } from "@/lib/prisma";
import {
  Ticket,
  TicketStatus,
  Category,
  Priority,
  AiState,
  MessageSender,
  Prisma,
} from "@prisma/client";

export interface TicketFilterOptions {
  authorId?: string;
  status?: TicketStatus;
  category?: Category;
  priority?: Priority;
  assignedToId?: string | null;
  from?: Date;
  to?: Date;
  search?: string;
  updatedSince?: Date;
}

export const ticketRepository = {
  async findById(id: string) {
    return prisma.ticket.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            city: true,
            joinedAt: true,
          },
        },
        book: true,
        assignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        messages: {
          orderBy: { createdAt: "asc" },
          include: {
            authorUser: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        internalNotes: {
          orderBy: { createdAt: "desc" },
          include: {
            admin: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
  },

  async findMany(
    filters: TicketFilterOptions,
    pagination: { skip?: number; take?: number } = { skip: 0, take: 50 }
  ) {
    const where: Prisma.TicketWhereInput = {};

    if (filters.authorId) {
      where.authorId = filters.authorId;
    }
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.category) {
      where.category = filters.category;
    }
    if (filters.priority) {
      where.priority = filters.priority;
    }
    if (filters.assignedToId !== undefined) {
      where.assignedToId = filters.assignedToId;
    }
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }
    if (filters.updatedSince) {
      where.updatedAt = { gt: filters.updatedSince };
    }
    if (filters.search) {
      where.OR = [
        { subject: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { author: { name: { contains: filters.search, mode: "insensitive" } } },
      ];
    }

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        skip: pagination.skip,
        take: pagination.take,
        orderBy: { createdAt: "desc" },
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          book: {
            select: {
              id: true,
              title: true,
              externalId: true,
              status: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
            },
          },
          _count: {
            select: {
              messages: true,
              internalNotes: true,
            },
          },
        },
      }),
      prisma.ticket.count({ where }),
    ]);

    return { tickets, total };
  },

  async create(data: {
    authorId: string;
    bookId?: string | null;
    subject: string;
    description: string;
    attachmentNames?: string[];
  }): Promise<Ticket> {
    return prisma.ticket.create({
      data: {
        authorId: data.authorId,
        bookId: data.bookId || null,
        subject: data.subject,
        description: data.description,
        attachmentNames: data.attachmentNames || [],
        aiState: AiState.PENDING,
        status: TicketStatus.OPEN,
      },
    });
  },

  async update(id: string, data: Prisma.TicketUpdateInput): Promise<Ticket> {
    return prisma.ticket.update({
      where: { id },
      data,
    });
  },

  async addMessage(data: {
    ticketId: string;
    sender: MessageSender;
    authorUserId: string;
    body: string;
  }) {
    return prisma.ticketMessage.create({
      data: {
        ticketId: data.ticketId,
        sender: data.sender,
        authorUserId: data.authorUserId,
        body: data.body,
      },
      include: {
        authorUser: {
          select: {
            id: true,
            name: true,
            role: true,
          },
        },
      },
    });
  },

  async addInternalNote(data: { ticketId: string; adminId: string; body: string }) {
    return prisma.internalNote.create({
      data: {
        ticketId: data.ticketId,
        adminId: data.adminId,
        body: data.body,
      },
      include: {
        admin: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  },

  async getAdminStats() {
    const [openCount, criticalCount, unassignedCount, resolvedTickets] = await Promise.all([
      prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
      prisma.ticket.count({ where: { priority: Priority.CRITICAL, status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } } }),
      prisma.ticket.count({ where: { assignedToId: null, status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] } } }),
      prisma.ticket.findMany({
        where: { firstRespondedAt: { not: null } },
        select: { createdAt: true, firstRespondedAt: true },
      }),
    ]);

    // Average first response in hours
    let avgFirstResponseHours = 0;
    if (resolvedTickets.length > 0) {
      const totalHours = resolvedTickets.reduce((acc, t) => {
        if (!t.firstRespondedAt) return acc;
        const diffMs = t.firstRespondedAt.getTime() - t.createdAt.getTime();
        return acc + diffMs / (1000 * 60 * 60);
      }, 0);
      avgFirstResponseHours = Math.round((totalHours / resolvedTickets.length) * 10) / 10;
    }

    return {
      open: openCount,
      critical: criticalCount,
      unassigned: unassignedCount,
      avgFirstResponseHours,
    };
  },
};
