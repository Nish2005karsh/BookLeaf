import { prisma } from "../prisma";
import { AiState, Category } from "@prisma/client";
import { draftTicketAI } from "./client";
import { buildAuthorBookFacts } from "./facts";
import { DraftPromptInput } from "./prompts/draftPrompt";

export interface GetOrGenerateDraftResult {
  draft: string;
  source: "ai" | "template";
  cached: boolean;
  generatedAt: Date;
}

/**
 * Lazy draft generation with database caching.
 * Regenerate is supported via { force: true }.
 */
export async function getOrGenerateTicketDraft(
  ticketId: string,
  options?: { force?: boolean }
): Promise<GetOrGenerateDraftResult> {
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    include: {
      author: true,
      book: true,
      messages: {
        orderBy: { createdAt: "asc" },
        take: 10,
      },
    },
  });

  if (!ticket) {
    throw new Error(`Ticket ${ticketId} not found`);
  }

  // 1. Return cached draft if available and not forced
  if (!options?.force && ticket.draftResponse) {
    return {
      draft: ticket.draftResponse,
      source: ticket.draftState === AiState.DONE ? "ai" : "template",
      cached: true,
      generatedAt: ticket.draftGeneratedAt || ticket.updatedAt,
    };
  }

  // 2. Build facts & messages
  const facts = buildAuthorBookFacts(ticket.author, ticket.book);
  const recentMessages = ticket.messages.map((m) => ({
    senderRole: m.sender === "AUTHOR" ? "author" : "support",
    content: m.body,
  }));

  const input: DraftPromptInput = {
    category: ticket.category || Category.GENERAL_INQUIRY,
    facts,
    ticketSubject: ticket.subject,
    ticketDescription: ticket.description,
    recentMessages,
  };

  // 3. Call AI client (handles provider, fallback, timeouts, retries)
  const result = await draftTicketAI(input, ticket.id);
  const now = new Date();

  // 4. Cache in database
  await prisma.ticket.update({
    where: { id: ticket.id },
    data: {
      draftResponse: result.draft,
      draftGeneratedAt: now,
      draftState: result.source === "ai" ? AiState.DONE : AiState.FAILED,
    },
  });

  return {
    draft: result.draft,
    source: result.source,
    cached: false,
    generatedAt: now,
  };
}
