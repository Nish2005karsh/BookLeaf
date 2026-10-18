import { Category } from "@prisma/client";
import { TicketFactsData, calculateNextPayoutWindow } from "./facts";

/**
 * Builds a deterministic template draft matching BookLeaf's exact tone guidelines:
 * Acknowledge -> Specific facts/dates -> Clear timeline -> Explicit next step -> Warm regards.
 *
 * Missing facts are formatted as [[VERIFY: ...]] markers per PRD Section 10.5.
 */
export function generateFallbackDraft(
  category: Category | string,
  facts: TicketFactsData
): string {
  const { author, book } = facts;
  const firstName = author.firstName || author.name.split(" ")[0] || "Author";
  const { quarterName, payoutDateString } = calculateNextPayoutWindow();

  const bookTitle = book?.title || "your book";
  const inProd = book?.status?.toLowerCase().includes("production");

  switch (category) {
    case "ROYALTY_PAYMENTS": {
      // Variant 1: Book in production
      if (inProd) {
        return `Dear ${firstName},

Thank you for reaching out regarding royalties for ${bookTitle}.

Our records show that ${bookTitle} is currently in production (${book?.status || "Cover Design / Typesetting"}). Because the book has not yet completed distribution setup and gone live on retail channels, no sales or royalties have accrued to date.

Once your title goes live on Amazon, Flipkart, and the BookLeaf Store, all sales will be tracked live in your dashboard. Royalties are calculated quarterly and disbursed within 45 days of the quarter ending.

Please let us know if you need any updates on your current production proofs!

Warm regards,
Team BookLeaf`;
      }

      // Variant 2: Pending < ₹1,000 threshold rollover
      if (book && book.royaltyPending > 0 && book.royaltyPending < 1000) {
        return `Dear ${firstName},

Thank you for reaching out regarding your royalty balance for ${bookTitle}.

Looking at your sales dashboard, you have accumulated ₹${book.royaltyPending} in pending royalties from ${book.copiesSold} copies sold.

Under BookLeaf's royalty policy, payouts are disbursed quarterly with a minimum payout threshold of ₹1,000. Because your current pending balance of ₹${book.royaltyPending} is below ₹1,000, it automatically rolls over into the current cycle (${quarterName}). It will be disbursed directly to your linked bank account as soon as your total reaches ₹1,000.

Please verify that your bank details and IFSC code are up to date in your dashboard so future payouts process seamlessly.

Warm regards,
Team BookLeaf`;
      }

      // Variant 3: ₹0 paid and overdue
      if (book && book.royaltyPaid === 0 && book.copiesSold > 0) {
        return `Dear ${firstName},

Thank you for contacting us, and I completely understand your frustration regarding not receiving your royalty payout yet for ${bookTitle}.

Our records show that ${bookTitle} has sold ${book.copiesSold} copies with ₹${book.royaltyEarned} in earned royalties, with ₹0 disbursed to date. This payment is overdue past our standard quarterly 45-day window.

I have escalated this directly to our accounts and finance desk with a strict 48-hour resolution timeline. Please confirm that your linked account number is correct: [[VERIFY: bank details and IFSC verified in dashboard?]]. We will update you as soon as the transfer reference is generated.

Warm regards,
Team BookLeaf`;
      }

      // Default royalty response
      return `Dear ${firstName},

Thank you for contacting us regarding your royalty statement for ${bookTitle}.

As per our records, ${bookTitle} has sold ${book?.copiesSold ?? 0} copies with a total royalty earned of ₹${book?.royaltyEarned ?? 0} (₹${book?.royaltyPaid ?? 0} disbursed, ₹${book?.royaltyPending ?? 0} currently pending).

Under BookLeaf's quarterly schedule, earnings for ${quarterName} are disbursed within 45 days of the quarter end, by ${payoutDateString}. Payouts are made by direct bank transfer for amounts meeting the ₹1,000 threshold.

Please let us know if you would like an itemized platform sales breakdown or if you need to update your payout details.

Warm regards,
Team BookLeaf`;
    }

    case "ISBN_METADATA": {
      const isbnStr = book?.isbn || "[[VERIFY: correct imprint ISBN?]]";
      return `Dear ${firstName},

Thank you for bringing this catalog issue to our attention immediately. Having an ISBN or metadata mismatch on marketplace listings is a serious concern, and we treat it with critical priority.

We have verified that your BookLeaf imprint ISBN for ${bookTitle} is ${isbnStr}. Our catalog operations team is escalating this directly to our platform distribution lead to submit an expedited metadata refresh to Amazon and Flipkart.

Our team will investigate this and get back to you with a resolution within 48 hours. Please let us know if you have noticed this discrepancy on any other platforms: [[VERIFY: check Amazon US, Amazon UK, and Flipkart listings]].

Warm regards,
Team BookLeaf`;
    }

    case "PRINTING_QUALITY": {
      const partner = book?.printPartner || "our printing facility";
      return `Dear ${firstName},

Please accept our sincere apologies for the print quality defects you observed on your copies of ${bookTitle}. BookLeaf takes immense pride in print standards, and this falls short of our expectations.

Could you please share 2–3 clear photographs of the defective copies (showing the cover, binding, and interior alignment)? As soon as our quality team verifies the defect, we will arrange a complete free reprint through ${partner} within 5–7 business days at zero cost to you.

Once you reply with the photos, we will immediately initiate the replacement order with our press.

Warm regards,
Team BookLeaf`;
    }

    case "DISTRIBUTION_AVAILABILITY": {
      return `Dear ${firstName},

Thank you for alerting us about the listing status for ${bookTitle}.

When a live title suddenly displays as "Currently Unavailable" on Amazon or Flipkart, it usually indicates a temporary inventory sync glitch between the marketplace feed and our Delhi warehouse.

I have submitted an urgent inventory re-sync request to our distribution team today. Marketplace listings typically refresh and show active stock within 24–48 hours.

We are monitoring the listing and will confirm once active inventory is restored.

Warm regards,
Team BookLeaf`;
    }

    case "BOOK_STATUS_PRODUCTION": {
      const currentStage = book?.status || "Cover Design";
      return `Dear ${firstName},

Thank you for following up on the production progress of ${bookTitle}.

Your manuscript is currently at the ${currentStage} stage. While production revisions can sometimes experience delays during layout proofing or author approvals, our team is actively moving your files through the next milestone.

Our production team will complete the current proof and email the revised files to you within 3 business days for your review. Please confirm your approval as soon as you review the proof so we can proceed to ISBN assignment and printing.

Warm regards,
Team BookLeaf`;
    }

    case "GENERAL_INQUIRY":
    default: {
      return `Dear ${firstName},

Thank you for reaching out to BookLeaf author support.

Regarding your inquiry about ${bookTitle}: any updates to your author bio, book description, or account details can be submitted directly through your portal or by replying to this message. Once submitted, changes reflect across our partner platforms within 3–5 business days.

Please let us know if you have any additional details to share, and our team will be delighted to assist you.

Warm regards,
Team BookLeaf`;
    }
  }
}
