import { describe, it, expect, beforeAll } from "vitest";
import { ticketService } from "@/server/services/ticketService";
import { bookService } from "@/server/services/bookService";
import { AuthenticatedUser } from "@/lib/auth/guards";
import { Role, TicketStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { NotFoundError, ConflictError } from "@/lib/http/errors";

describe("RBAC & Serialization Isolation", () => {
  let authorUser1: AuthenticatedUser;
  let authorUser2: AuthenticatedUser;
  let adminUser: AuthenticatedUser;
  let ticketId1: string;

  beforeAll(async () => {
    // Look up seeded users for testing
    const a1 = await prisma.user.findFirst({ where: { role: Role.AUTHOR } });
    const a2 = await prisma.user.findFirst({
      where: { role: Role.AUTHOR, id: { not: a1?.id } },
    });
    const adm = await prisma.user.findFirst({ where: { role: Role.ADMIN } });

    if (!a1 || !a2 || !adm) {
      throw new Error("Seed database missing required users");
    }

    authorUser1 = { userId: a1.id, email: a1.email, role: a1.role, name: a1.name };
    authorUser2 = { userId: a2.id, email: a2.email, role: a2.role, name: a2.name };
    adminUser = { userId: adm.id, email: adm.email, role: adm.role, name: adm.name };

    // Find a ticket belonging to author 1
    const t = await prisma.ticket.findFirst({
      where: { authorId: authorUser1.userId },
      include: { book: true },
    });

    if (t) {
      ticketId1 = t.id;
    } else {
      // Create a test ticket for author 1
      const created = await prisma.ticket.create({
        data: {
          authorId: authorUser1.userId,
          subject: "Test RBAC ticket",
          description: "Initial description for testing",
          status: TicketStatus.OPEN,
        },
      });
      ticketId1 = created.id;
    }
  });

  it("author can view their own ticket with strict filtering of internal notes and AI fields", async () => {
    const serialized = await ticketService.getTicketById(ticketId1, authorUser1);

    expect(serialized).toBeDefined();
    expect(serialized.id).toBe(ticketId1);
    expect(serialized.subject).toBeDefined();

    // Verify Author serialization NEVER leaks internal notes, drafts, or AI diagnostics
    expect((serialized as any).internalNotes).toBeUndefined();
    expect((serialized as any).draftResponse).toBeUndefined();
    expect((serialized as any).aiConfidence).toBeUndefined();
    expect((serialized as any).aiReason).toBeUndefined();
    expect((serialized as any).categoryOverriddenById).toBeUndefined();
    expect((serialized as any).priorityOverriddenById).toBeUndefined();
  });

  it("author receives 404 when attempting to access another author's ticket (prevents ID enumeration)", async () => {
    await expect(ticketService.getTicketById(ticketId1, authorUser2)).rejects.toThrow(NotFoundError);
  });

  it("admin can view full ticket including AI triage, internal notes, and draft", async () => {
    const adminSerialized = await ticketService.getTicketById(ticketId1, adminUser);

    expect(adminSerialized).toBeDefined();
    expect(adminSerialized.id).toBe(ticketId1);
    expect(adminSerialized.internalNotes).toBeDefined();
    expect(Array.isArray(adminSerialized.internalNotes)).toBe(true);
    expect(adminSerialized.category).toBeDefined();
    expect(adminSerialized.priority).toBeDefined();
  });

  it("author list only returns their own tickets and never another author's tickets", async () => {
    const author1List = await ticketService.listTickets(authorUser1, {});
    const author2List = await ticketService.listTickets(authorUser2, {});

    // Ensure no ticket IDs overlap
    const author1Ids = new Set(author1List.tickets.map((t) => t.id));
    for (const t2 of author2List.tickets) {
      expect(author1Ids.has(t2.id)).toBe(false);
    }
  });

  it("author cannot access another author's book by ID", async () => {
    const bookOfAuthor1 = await prisma.book.findFirst({
      where: { authorId: authorUser1.userId },
    });

    if (bookOfAuthor1) {
      await expect(bookService.getBookById(bookOfAuthor1.id, authorUser2)).rejects.toThrow(NotFoundError);
    }
  });

  it("rejects new messages on CLOSED tickets with ConflictError (409)", async () => {
    // Temporarily set ticket to CLOSED
    await prisma.ticket.update({
      where: { id: ticketId1 },
      data: { status: TicketStatus.CLOSED },
    });

    await expect(
      ticketService.addMessage(ticketId1, "Followup on closed ticket", authorUser1)
    ).rejects.toThrow(ConflictError);

    // Restore to OPEN
    await prisma.ticket.update({
      where: { id: ticketId1 },
      data: { status: TicketStatus.OPEN },
    });
  });

  it("reopens ticket to OPEN when author sends a follow-up message on a RESOLVED ticket", async () => {
    // Set ticket to RESOLVED
    await prisma.ticket.update({
      where: { id: ticketId1 },
      data: { status: TicketStatus.RESOLVED },
    });

    await ticketService.addMessage(ticketId1, "Still having this issue", authorUser1);

    const updated = await prisma.ticket.findUnique({ where: { id: ticketId1 } });
    expect(updated?.status).toBe(TicketStatus.OPEN);
  });
});
