import { describe, it, expect } from "vitest";
import { calculateUrgencyScore, PRIORITY_WEIGHTS } from "@/lib/tickets/urgency";
import { Priority, TicketStatus } from "@prisma/client";

describe("Urgency Score Calculation", () => {
  it("returns 0 for RESOLVED and CLOSED tickets regardless of priority or age", () => {
    const resolved = calculateUrgencyScore({
      status: TicketStatus.RESOLVED,
      priority: Priority.CRITICAL,
      createdAt: new Date(Date.now() - 72 * 3600 * 1000), // 3 days old
    });
    expect(resolved).toBe(0);

    const closed = calculateUrgencyScore({
      status: TicketStatus.CLOSED,
      priority: Priority.HIGH,
      createdAt: new Date(Date.now() - 100 * 3600 * 1000),
    });
    expect(closed).toBe(0);
  });

  it("prioritizes CRITICAL tickets over HIGH, MEDIUM, and LOW", () => {
    const now = new Date();
    const critical = calculateUrgencyScore({
      status: TicketStatus.OPEN,
      priority: Priority.CRITICAL,
      createdAt: now,
    });
    const high = calculateUrgencyScore({
      status: TicketStatus.OPEN,
      priority: Priority.HIGH,
      createdAt: now,
    });
    const medium = calculateUrgencyScore({
      status: TicketStatus.OPEN,
      priority: Priority.MEDIUM,
      createdAt: now,
    });
    const low = calculateUrgencyScore({
      status: TicketStatus.OPEN,
      priority: Priority.LOW,
      createdAt: now,
    });

    expect(critical).toBeGreaterThan(high);
    expect(high).toBeGreaterThan(medium);
    expect(medium).toBeGreaterThan(low);
  });

  it("increases urgency score over time as tickets age", () => {
    const freshDate = new Date();
    const olderDate = new Date(Date.now() - 24 * 3600 * 1000); // 24 hours ago

    const freshScore = calculateUrgencyScore({
      status: TicketStatus.OPEN,
      priority: Priority.HIGH,
      createdAt: freshDate,
    });

    const olderScore = calculateUrgencyScore({
      status: TicketStatus.OPEN,
      priority: Priority.HIGH,
      createdAt: olderDate,
    });

    // 24 hours * 2 = ~48 point difference
    expect(olderScore).toBeGreaterThan(freshScore);
    expect(olderScore - freshScore).toBeGreaterThanOrEqual(47);
    expect(olderScore - freshScore).toBeLessThanOrEqual(49);
  });
});
