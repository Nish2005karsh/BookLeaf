import { Category } from "@prisma/client";

export const KNOWLEDGE_BASE = {
  company: `BookLeaf Publishing is a self-publishing company operating in India & US.
Packages: Standard Free (no upfront cost) and Bestseller Breakthrough (premium paid package with marketing/distribution add-ons).
Services: Cover design, typesetting, ISBN assignment, printing, distribution, royalty management.
Facilities: In-house printing facility and warehouse in Delhi; print partners Repro India and Epitome Books.`,

  royalty: `80/20 royalty split: 80% of net profit goes to author, 20% to BookLeaf.
Net profit = MRP − printing cost − platform commission (Amazon/Flipkart) − shipping.
Cycle: Calculated quarterly, paid within 45 days of quarter end.
Minimum payout threshold: ₹1,000. Accumulated royalties below ₹1,000 roll over to the next quarter.
Payout method: Bank transfer to the account linked in author dashboard.
Transparency: Detailed per-platform breakdown available in author dashboard.`,

  isbn: `Every book gets a unique ISBN assigned by BookLeaf, registered under BookLeaf's publisher imprint.
Authors wanting their own imprint ISBN must obtain it independently.
ISBN errors (duplicate, wrong book linked, mismatch on marketplace) are treated as high priority and escalated immediately to production team.`,

  printing: `In-house facility handles most orders; overflow or specific format requirements go to Repro India or Epitome Books.
Turnaround: Standard turnaround 5-7 business days from order confirmation.
Quality issues: For misprints, binding defects, or color inconsistencies, BookLeaf arranges a free reprint after verification (photos may be requested).`,

  distribution: `Books are listed on Amazon India, Flipkart, Amazon US, Amazon UK, and BookLeaf Store.
Timeline: New listings typically go live 7-10 business days after publication is complete.
Stock status: "Currently Unavailable" usually indicates a stock sync issue. BookLeaf can trigger an inventory re-sync within 24-48 hours.`,

  production: `Production Stages: Manuscript Received → Editing (if opted) → Cover Design → Typesetting → Proofreading → ISBN Assignment → Printing → Distribution Setup → Published & Live.
Updates: Authors are emailed at each stage.
Delays: Typically occur at Cover Design (awaiting author approval) and Proofreading (revision rounds).`,

  general: `Metadata and description updates on live books can be submitted through the dashboard or by emailing the team; changes reflect on platforms in 3-5 business days.`,

  tone: `Tone Guidelines:
- Empathetic and professional; authors are partners, not customers to manage.
- Acknowledge author concern sincerely before presenting solutions.
- Be specific with real numbers, dates, and statuses.
- Own BookLeaf mistakes directly with no corporate deflection.
- For escalations, always give a clear timeline ("Our team will look into this and get back to you within 48 hours").
- Always end with a clear next step.
- Sign off: "Warm regards,\nTeam BookLeaf"`,

  examples: {
    ROYALTY_PAYMENTS: `Sample: "I published my book 4 months ago and still haven't received any royalty."
Response Framing: Acknowledge frustration sincerely. Explain quarterly cycle + 45-day window. Check if bank details are linked. Provide specific next payout date. If overdue, escalate with 48h timeline.`,
    ISBN_METADATA: `Sample: "My book is showing a different ISBN on Amazon than on physical copy."
Response Framing: Treat as critical priority. Acknowledge serious data issue. Confirm escalating to production team immediately with 48h timeline.`,
    PRINTING_QUALITY: `Sample: "I received author copies and print quality is blurry and misaligned."
Response Framing: Apologize sincerely. Ask author to share photos of defective copies. Confirm free reprint once verified within 5-7 business days.`,
    DISTRIBUTION_AVAILABILITY: `Sample: "Book is showing as Currently Unavailable on Amazon."
Response Framing: Explain stock sync issue. Confirm triggering re-sync with distribution team within 24-48 hours.`,
    BOOK_STATUS_PRODUCTION: `Sample: "3 weeks in typesetting, when will it be done?"
Response Framing: Check actual status. Be honest about reason. Provide specific updated timeline. Frame collaboratively without blaming author.`,
    GENERAL_INQUIRY: `Sample: "Can I update the description of my book on Amazon?"
Response Framing: Confirm metadata updates can be submitted via dashboard or email, reflecting within 3-5 business days.`,
  },
};

/**
 * Returns only the KB section required for the category (+ royalty if monetary terms are involved)
 * and the specific category few-shot calibration example.
 */
export function getKnowledgeBaseForPrompt(
  category: Category | string,
  includeRoyalty = false
): string {
  const normalized = category as Category;
  const sections: string[] = [];

  switch (normalized) {
    case "ROYALTY_PAYMENTS":
      sections.push(`[KB: Royalty & Payments]\n${KNOWLEDGE_BASE.royalty}`);
      break;
    case "ISBN_METADATA":
      sections.push(`[KB: ISBN & Metadata]\n${KNOWLEDGE_BASE.isbn}`);
      break;
    case "PRINTING_QUALITY":
      sections.push(`[KB: Printing & Quality]\n${KNOWLEDGE_BASE.printing}`);
      break;
    case "DISTRIBUTION_AVAILABILITY":
      sections.push(`[KB: Distribution & Availability]\n${KNOWLEDGE_BASE.distribution}`);
      break;
    case "BOOK_STATUS_PRODUCTION":
      sections.push(`[KB: Production Pipeline]\n${KNOWLEDGE_BASE.production}`);
      break;
    case "GENERAL_INQUIRY":
    default:
      sections.push(`[KB: General Policies]\n${KNOWLEDGE_BASE.general}`);
      break;
  }

  if (includeRoyalty && normalized !== "ROYALTY_PAYMENTS") {
    sections.push(`[KB: Royalty & Payments]\n${KNOWLEDGE_BASE.royalty}`);
  }

  const example = KNOWLEDGE_BASE.examples[normalized as keyof typeof KNOWLEDGE_BASE.examples];
  if (example) {
    sections.push(`[Calibration Example]\n${example}`);
  }

  return sections.join("\n\n");
}

export function getKnowledgeSnippetForCategory(
  category: Category | string,
  includeRoyalty = false
): string {
  return getKnowledgeBaseForPrompt(category, includeRoyalty);
}

export function getFewShotExample(category: Category | string): string {
  const normalized = category as keyof typeof KNOWLEDGE_BASE.examples;
  return KNOWLEDGE_BASE.examples[normalized] || KNOWLEDGE_BASE.examples.GENERAL_INQUIRY;
}
