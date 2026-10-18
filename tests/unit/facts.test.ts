import { describe, it, expect } from "vitest";
import {
  calculateNextPayoutWindow,
  buildFactsBlock,
  buildTicketFactsData,
} from "@/lib/ai/facts";

describe("Facts Builder & Payout Calculations", () => {
  it("calculates quarterly payout windows and 45-day cycle correctly across all 4 quarter edges", () => {
    // Q1 edge: February 15
    const q1Date = new Date(Date.UTC(2026, 1, 15));
    const q1Result = calculateNextPayoutWindow(q1Date);
    expect(q1Result.quarterName).toContain("Q1 2026");
    expect(q1Result.payoutDate.getUTCMonth()).toBe(4); // May (0-indexed 4)
    expect(q1Result.payoutDate.getUTCDate()).toBe(15); // May 15

    // Q2 edge: May 10
    const q2Date = new Date(Date.UTC(2026, 4, 10));
    const q2Result = calculateNextPayoutWindow(q2Date);
    expect(q2Result.quarterName).toContain("Q2 2026");
    expect(q2Result.payoutDate.getUTCMonth()).toBe(7); // August (0-indexed 7)
    expect(q2Result.payoutDate.getUTCDate()).toBe(14); // Aug 14

    // Q3 edge: August 20
    const q3Date = new Date(Date.UTC(2026, 7, 20));
    const q3Result = calculateNextPayoutWindow(q3Date);
    expect(q3Result.quarterName).toContain("Q3 2026");
    expect(q3Result.payoutDate.getUTCMonth()).toBe(10); // November (0-indexed 10)
    expect(q3Result.payoutDate.getUTCDate()).toBe(14); // Nov 14

    // Q4 edge: November 5
    const q4Date = new Date(Date.UTC(2026, 10, 5));
    const q4Result = calculateNextPayoutWindow(q4Date);
    expect(q4Result.quarterName).toContain("Q4 2026");
    expect(q4Result.payoutDate.getUTCFullYear()).toBe(2027); // Feb of next year
    expect(q4Result.payoutDate.getUTCMonth()).toBe(1); // February (0-indexed 1)
    expect(q4Result.payoutDate.getUTCDate()).toBe(14); // Feb 14
  });

  it("identifies royalty pending below ₹1,000 threshold as rolling over", () => {
    const author = { name: "Kavita Rao", email: "kavita@example.com" };
    const bookWithRollover = {
      title: "The Nagpur Notebooks",
      status: "PUBLISHED",
      copiesSold: 45,
      royaltyEarned: 850,
      royaltyPaid: 0,
      royaltyPending: 850, // below 1000
    };

    const facts = buildTicketFactsData(author, bookWithRollover);
    const block = buildFactsBlock(facts);

    expect(block).toContain("Pending Below ₹1,000 Threshold: YES (rolls over to next quarter)");
    expect(block).toContain("Royalty Pending: ₹850");
  });

  it("handles in-production books with missing ISBN and zero copies gracefully", () => {
    const author = { name: "Vikram Seth", email: "vikram@example.com" };
    const bookInProd = {
      title: "Midnight in Mysore",
      status: "IN_PRODUCTION",
      isbn: null,
      mrp: null,
      copiesSold: 0,
      royaltyEarned: 0,
      royaltyPaid: 0,
      royaltyPending: 0,
    };

    const facts = buildTicketFactsData(author, bookInProd);
    const block = buildFactsBlock(facts);

    expect(block).toContain("In Production: YES (IN_PRODUCTION)");
    expect(block).toContain("[[VERIFY: ISBN not yet assigned]]");
    expect(block).toContain("Copies Sold: 0 (In Production)");
    expect(block).toContain("MRP: Not yet set");
  });
});
