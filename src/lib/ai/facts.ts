export interface BookFacts {
  title: string;
  externalId: string;
  status: string;
  isbn: string | null;
  mrp: number | null;
  royaltyPerCopy: number | null;
  copiesSold: number;
  royaltyEarned: number;
  royaltyPaid: number;
  royaltyPending: number;
  lastPayoutDate: string | null;
  printPartner: string | null;
  availableOn: string[];
  publicationDate: string | null;
}

export interface AuthorFacts {
  name: string;
  firstName: string;
  email: string;
  phone?: string | null;
  city?: string | null;
  joinedAt?: string | null;
}

export interface TicketFactsData {
  author: AuthorFacts;
  book?: BookFacts | null;
  ticketCreatedAt: Date | string;
}

export type AuthorBookFacts = TicketFactsData;

export function buildTicketFactsData(author: any, book?: any): TicketFactsData {
  return {
    author: {
      name: author.name,
      firstName: author.name.split(" ")[0] || author.name,
      email: author.email,
      phone: author.phone,
      city: author.city,
      joinedAt: author.joinedAt?.toISOString?.() || author.joinedAt,
    },
    book: book
      ? {
          title: book.title,
          externalId: book.externalId || book.id,
          status: book.status,
          isbn: book.isbn,
          mrp: book.mrp,
          royaltyPerCopy: book.royaltyPerCopy,
          copiesSold: book.copiesSold || 0,
          royaltyEarned: book.royaltyEarned || 0,
          royaltyPaid: book.royaltyPaid || 0,
          royaltyPending: book.royaltyPending || 0,
          lastPayoutDate:
            book.lastPayoutDate?.toISOString?.() ||
            (book.lastPayoutDate ? String(book.lastPayoutDate) : null),
          printPartner: book.printPartner,
          availableOn: Array.isArray(book.availableOn) ? book.availableOn : [],
          publicationDate:
            book.publishedAt?.toISOString?.() ||
            (book.publishedAt ? String(book.publishedAt) : null),
        }
      : null,
    ticketCreatedAt: new Date(),
  };
}

export const buildAuthorBookFacts = buildTicketFactsData;

/**
 * Calculates the next quarterly payout date window (quarter end date + 45 days).
 */
export function calculateNextPayoutWindow(refDate = new Date()): {
  quarterName: string;
  payoutDateString: string;
  payoutDate: Date;
} {
  const year = refDate.getFullYear();
  const month = refDate.getMonth(); // 0-indexed

  // Quarters:
  // Q1: Jan-Mar (end March 31) -> payout by May 15
  // Q2: Apr-Jun (end June 30) -> payout by Aug 14
  // Q3: Jul-Sep (end Sept 30) -> payout by Nov 14
  // Q4: Oct-Dec (end Dec 31) -> payout by Feb 14 of next year
  let quarterEnd: Date;
  let quarterName: string;

  if (month < 3) {
    // We are in Q1, previous cycle was Q4 of last year (due mid Feb) or current Q1 (due mid May)
    quarterEnd = new Date(Date.UTC(year, 2, 31));
    quarterName = `Q1 ${year} (Jan–Mar)`;
  } else if (month < 6) {
    quarterEnd = new Date(Date.UTC(year, 5, 30));
    quarterName = `Q2 ${year} (Apr–Jun)`;
  } else if (month < 9) {
    quarterEnd = new Date(Date.UTC(year, 8, 30));
    quarterName = `Q3 ${year} (Jul–Sep)`;
  } else {
    quarterEnd = new Date(Date.UTC(year, 11, 31));
    quarterName = `Q4 ${year} (Oct–Dec)`;
  }

  // Add 45 days
  const payoutDate = new Date(quarterEnd.getTime() + 45 * 24 * 60 * 60 * 1000);
  const payoutDateString = payoutDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return { quarterName, payoutDateString, payoutDate };
}

/**
 * Assembles deterministic facts block in code to prevent hallucination.
 */
export function buildFactsBlock(data: TicketFactsData): string {
  const { author, book } = data;
  const firstName = author.firstName || author.name.split(" ")[0] || author.name;
  const { quarterName, payoutDateString } = calculateNextPayoutWindow();

  const lines: string[] = [
    `Author First Name: ${firstName}`,
    `Author Full Name: ${author.name}`,
    `Author Email: ${author.email}`,
  ];

  if (book) {
    const inProd = book.status.toLowerCase().includes("production");
    const pubDate = book.publicationDate ? new Date(book.publicationDate) : null;
    const daysSincePub = pubDate
      ? Math.max(0, Math.floor((Date.now() - pubDate.getTime()) / (1000 * 60 * 60 * 24)))
      : null;

    lines.push(
      `Book Title: ${book.title}`,
      `Book ID: ${book.externalId}`,
      `Book Status: ${book.status}`,
      `In Production: ${inProd ? "YES (" + book.status + ")" : "NO (Published)"}`,
      `ISBN: ${book.isbn || "[[VERIFY: ISBN not yet assigned]]"}`,
      `MRP: ${book.mrp ? "₹" + book.mrp : "Not yet set"}`,
      `Royalty Rate: ${book.royaltyPerCopy ? "₹" + book.royaltyPerCopy + " / copy" : "Not yet set"}`,
      `Copies Sold: ${inProd ? "0 (In Production)" : book.copiesSold}`,
      `Total Royalty Earned: ₹${book.royaltyEarned}`,
      `Royalty Paid to Date: ₹${book.royaltyPaid}`,
      `Royalty Pending: ₹${book.royaltyPending}`,
      `Pending Below ₹1,000 Threshold: ${book.royaltyPending > 0 && book.royaltyPending < 1000 ? "YES (rolls over to next quarter)" : "NO"}`,
      `Days Since Publication: ${daysSincePub !== null ? daysSincePub + " days" : "N/A (in production)"}`,
      `Last Payout Date: ${book.lastPayoutDate || "No previous payout recorded"}`,
      `Print Partner: ${book.printPartner || "In-House"}`,
      `Available Platforms: ${book.availableOn.length ? book.availableOn.join(", ") : "None"}`
    );
  } else {
    lines.push("Book Context: General / Account-level query (No specific book attached)");
  }

  lines.push(
    `Current Royalty Cycle: ${quarterName}`,
    `Next Payout Window: by ${payoutDateString} (within 45 days of quarter end)`
  );

  return lines.join("\n");
}

export const formatFactsForPrompt = buildFactsBlock;
