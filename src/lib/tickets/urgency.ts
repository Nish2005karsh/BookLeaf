import { Priority, TicketStatus } from "@prisma/client";

export const PRIORITY_WEIGHTS: Record<Priority, number> = {
  CRITICAL: 1000,
  HIGH: 600,
  MEDIUM: 300,
  LOW: 100,
};

/**
 * Computes urgency score for a ticket:
 * priorityWeight + ageHours * 2 for unresolved tickets.
 * Resolved and Closed tickets sink to the bottom (score = 0).
 */
export function calculateUrgencyScore(ticket: {
  status: TicketStatus;
  priority?: Priority | null;
  createdAt: Date | string;
}): number {
  if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
    return 0;
  }

  const priorityWeight = ticket.priority ? PRIORITY_WEIGHTS[ticket.priority] || 100 : 100;
  const createdDate = new Date(ticket.createdAt);
  const now = new Date();
  const ageMs = Math.max(0, now.getTime() - createdDate.getTime());
  const ageHours = ageMs / (1000 * 60 * 60);

  return Math.round(priorityWeight + ageHours * 2);
}
