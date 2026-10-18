import { describe, it, expect } from "vitest";
import { fallbackClassify } from "@/lib/ai/fallback";
import { Category, Priority } from "@prisma/client";

describe("Fallback Classifier (Rule-based Triage)", () => {
  const testCases: Array<{
    id: number;
    subject: string;
    description: string;
    expectedCategory: Category;
    expectedPriority: Priority;
  }> = [
    {
      id: 1,
      subject: "Missing royalty payout",
      description: "I published my book 4 months ago and still haven't received any royalty.",
      expectedCategory: Category.ROYALTY_PAYMENTS,
      expectedPriority: Priority.CRITICAL,
    },
    {
      id: 2,
      subject: "Royalty calculation question",
      description: "My book sold 200 copies on Amazon but my royalty is only ₹3,000, please explain the net profit breakdown.",
      expectedCategory: Category.ROYALTY_PAYMENTS,
      expectedPriority: Priority.MEDIUM,
    },
    {
      id: 3,
      subject: "ISBN mismatch",
      description: "My book is showing a wrong different ISBN on Amazon than on physical copy!",
      expectedCategory: Category.ISBN_METADATA,
      expectedPriority: Priority.CRITICAL,
    },
    {
      id: 4,
      subject: "Damaged author copies",
      description: "I received author copies and print quality is blurry and binding is misaligned.",
      expectedCategory: Category.PRINTING_QUALITY,
      expectedPriority: Priority.HIGH,
    },
    {
      id: 5,
      subject: "Amazon out of stock",
      description: "My book is showing Currently Unavailable on Amazon India.",
      expectedCategory: Category.DISTRIBUTION_AVAILABILITY,
      expectedPriority: Priority.HIGH,
    },
    {
      id: 6,
      subject: "Typesetting delay",
      description: "3 weeks in typesetting, when will it be done and published?",
      expectedCategory: Category.BOOK_STATUS_PRODUCTION,
      expectedPriority: Priority.HIGH,
    },
    {
      id: 7,
      subject: "Description change",
      description: "Can I update the author bio and book description on Amazon?",
      expectedCategory: Category.ISBN_METADATA,
      expectedPriority: Priority.LOW,
    },
    {
      id: 8,
      subject: "Bank account update",
      description: "Need to update my bank account details for upcoming quarterly royalty transfer.",
      expectedCategory: Category.ROYALTY_PAYMENTS,
      expectedPriority: Priority.MEDIUM,
    },
    {
      id: 9,
      subject: "Legal action notice",
      description: "You haven't paid my royalty for 8 months, I will file a lawsuit and police complaint for fraud.",
      expectedCategory: Category.ROYALTY_PAYMENTS,
      expectedPriority: Priority.CRITICAL,
    },
    {
      id: 10,
      subject: "Page quality query",
      description: "The print pages in my author copies feel too thin, can we check paper GSM?",
      expectedCategory: Category.PRINTING_QUALITY,
      expectedPriority: Priority.HIGH,
    },
    {
      id: 11,
      subject: "Flipkart listing issue",
      description: "Flipkart listing is out of stock and missing buy button.",
      expectedCategory: Category.DISTRIBUTION_AVAILABILITY,
      expectedPriority: Priority.HIGH,
    },
    {
      id: 12,
      subject: "Cover design revision",
      description: "I received the first cover design proof and want to request a font color revision.",
      expectedCategory: Category.BOOK_STATUS_PRODUCTION,
      expectedPriority: Priority.MEDIUM,
    },
    {
      id: 13,
      subject: "Publishing package inquiry",
      description: "Could you tell me what distribution channels are included in the Bestseller Breakthrough package?",
      expectedCategory: Category.DISTRIBUTION_AVAILABILITY,
      expectedPriority: Priority.MEDIUM,
    },
    {
      id: 14,
      subject: "General feedback",
      description: "Thank you for the wonderful publishing journey, had a general question about marketing services.",
      expectedCategory: Category.GENERAL_INQUIRY,
      expectedPriority: Priority.MEDIUM,
    },
    {
      id: 15,
      subject: "Wrong book live on Amazon",
      description: "The Amazon listing barcode and ISBN points to a completely wrong author's book!",
      expectedCategory: Category.ISBN_METADATA,
      expectedPriority: Priority.CRITICAL,
    },
  ];

  testCases.forEach((tc) => {
    it(`correctly classifies test case #${tc.id}: "${tc.subject}"`, () => {
      const result = fallbackClassify(tc.subject, tc.description);
      expect(result.category).toBe(tc.expectedCategory);
      expect(result.priority).toBe(tc.expectedPriority);
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.reason).toBeTruthy();
    });
  });
});
