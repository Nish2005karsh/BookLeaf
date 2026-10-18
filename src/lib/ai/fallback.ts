import { Category, Priority } from "@prisma/client";

export interface FallbackClassificationResult {
  category: Category;
  priority: Priority;
  confidence: number;
  reason: string;
}

/**
 * Deterministic keyword & regex fallback classifier.
 * Requires zero network calls.
 * Used when AI provider times out, hits rate limits (429), or is offline.
 */
export function fallbackClassify(
  subject: string,
  description: string,
  signals?: {
    royaltyPaid?: number;
    royaltyPending?: number;
    isInProduction?: boolean;
    monthsSincePublication?: number;
  }
): FallbackClassificationResult {
  const text = `${subject} ${description}`.toLowerCase();

  // 1. ISBN & Metadata
  if (
    text.includes("isbn") ||
    text.includes("imprint") ||
    text.includes("barcode")
  ) {
    const isCritical =
      text.includes("wrong") ||
      text.includes("mismatch") ||
      text.includes("duplicate") ||
      text.includes("different") ||
      text.includes("error");

    return {
      category: Category.ISBN_METADATA,
      priority: isCritical ? Priority.CRITICAL : Priority.HIGH,
      confidence: 0.85,
      reason: isCritical
        ? "Rule-based: Detected critical ISBN mismatch or error keyword"
        : "Rule-based: Detected ISBN or metadata query",
    };
  }

  // 2. Royalty & Payments
  if (
    text.includes("royalty") ||
    text.includes("payout") ||
    text.includes("payment") ||
    text.includes("bank") ||
    text.includes("threshold") ||
    text.includes("net profit") ||
    text.includes("earnings")
  ) {
    const isLongDelayed =
      text.includes("months") ||
      text.includes("never received") ||
      text.includes("haven't received") ||
      text.includes("overdue") ||
      (signals?.royaltyPaid === 0 && (signals?.monthsSincePublication || 0) >= 4);

    return {
      category: Category.ROYALTY_PAYMENTS,
      priority: isLongDelayed ? Priority.CRITICAL : Priority.MEDIUM,
      confidence: 0.88,
      reason: isLongDelayed
        ? "Rule-based: Delayed or missing royalty payout detected"
        : "Rule-based: Royalty and payment calculation question",
    };
  }

  // 3. Printing & Quality
  if (
    text.includes("print") ||
    text.includes("quality") ||
    text.includes("defect") ||
    text.includes("blurry") ||
    text.includes("misaligned") ||
    text.includes("binding") ||
    text.includes("pages") ||
    text.includes("cover quality") ||
    text.includes("author copies")
  ) {
    return {
      category: Category.PRINTING_QUALITY,
      priority: Priority.HIGH,
      confidence: 0.86,
      reason: "Rule-based: Physical print defect or quality concern detected",
    };
  }

  // 4. Distribution & Availability
  if (
    text.includes("amazon") ||
    text.includes("flipkart") ||
    text.includes("unavailable") ||
    text.includes("out of stock") ||
    text.includes("stock") ||
    text.includes("store") ||
    text.includes("listing") ||
    text.includes("distribution")
  ) {
    const isUnavailable =
      text.includes("unavailable") ||
      text.includes("out of stock") ||
      text.includes("missing") ||
      text.includes("not showing");

    return {
      category: Category.DISTRIBUTION_AVAILABILITY,
      priority: isUnavailable ? Priority.HIGH : Priority.MEDIUM,
      confidence: 0.84,
      reason: isUnavailable
        ? "Rule-based: Platform listing unavailability or sync problem"
        : "Rule-based: General distribution inquiry",
    };
  }

  // 5. Production Updates
  if (
    text.includes("production") ||
    text.includes("typesetting") ||
    text.includes("proof") ||
    text.includes("cover design") ||
    text.includes("editing") ||
    text.includes("manuscript") ||
    signals?.isInProduction
  ) {
    const isDelayed =
      text.includes("weeks") ||
      text.includes("delayed") ||
      text.includes("stalled") ||
      text.includes("still waiting");

    return {
      category: Category.BOOK_STATUS_PRODUCTION,
      priority: isDelayed ? Priority.HIGH : Priority.MEDIUM,
      confidence: 0.82,
      reason: isDelayed
        ? "Rule-based: Production delay inquiry"
        : "Rule-based: Book production status update check",
    };
  }

  // 6. General Inquiry (Default fallback)
  const isCosmetic =
    text.includes("bio") ||
    text.includes("description") ||
    text.includes("blurb") ||
    text.includes("author name") ||
    text.includes("typo");

  return {
    category: Category.GENERAL_INQUIRY,
    priority: isCosmetic ? Priority.LOW : Priority.MEDIUM,
    confidence: 0.75,
    reason: isCosmetic
      ? "Rule-based: Bio, description, or cosmetic edit request"
      : "Rule-based: General account or author inquiry",
  };
}
