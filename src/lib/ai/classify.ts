import { prisma } from "../prisma";
import { AiState, Ticket } from "@prisma/client";
import { classifyTicketAI } from "./client";
import { ClassifyInputSignals } from "./prompts/classifyPrompt";

/**
 * Perform classification on a ticket, persist the AI triage results,
 * and respect any existing admin overrides.
 */
export async function processTicketClassification(ticketId: string): Promise<Ticket | null> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      book: true,
      author: true,
    },
  });

  if (!ticket) {
    console.error(`[Classify] Ticket ${ticketId} not found`);
    return null;
  }

  // Calculate publication age in months
  let monthsSincePublication: number | undefined;
  if (ticket.book?.publicationDate) {
    const diffMs = Date.now() - new Date(ticket.book.publicationDate).getTime();
    monthsSincePublication = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30)));
  }

  const signals: ClassifyInputSignals = {
    subject: ticket.subject,
    description: ticket.description,
    bookTitle: ticket.book?.title,
    bookStatus: ticket.book?.status,
    isInProduction: ticket.book?.status === "IN_PRODUCTION",
    monthsSincePublication,
    royaltyPaidZero: ticket.book ? ticket.book.royaltyPaid === 0 : undefined,
    royaltyPending: ticket.book?.royaltyPending,
  };

  const result = await classifyTicketAI(signals, ticket.id);

  // Determine whether to update category / priority fields (only if not overridden by admin)
  const shouldUpdateCategory = !ticket.categoryOverriddenById;
  const shouldUpdatePriority = !ticket.priorityOverriddenById;

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      aiCategory: result.category,
      aiPriority: result.priority,
      aiConfidence: result.confidence,
      aiReason: result.reason,
      aiState: result.source === "ai" ? AiState.DONE : AiState.FAILED,
      ...(shouldUpdateCategory ? { category: result.category } : {}),
      ...(shouldUpdatePriority ? { priority: result.priority } : {}),
    },
  });

  return updated;
}
