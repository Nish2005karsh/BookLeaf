import { PrismaClient, Role, TicketStatus, Priority, Category, AiState, MessageSender } from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

interface SampleBook {
  book_id: string;
  title: string;
  isbn: string | null;
  genre: string;
  publication_date: string | null;
  status: string;
  mrp: number | null;
  author_royalty_per_copy: number | null;
  total_copies_sold: number;
  total_royalty_earned: number;
  royalty_paid: number;
  royalty_pending: number;
  last_royalty_payout_date: string | null;
  print_partner: string | null;
  available_on: string[];
}

interface SampleAuthor {
  author_id: string;
  name: string;
  email: string;
  phone: string;
  city: string;
  joined_date: string;
  books: SampleBook[];
}

interface SampleData {
  authors: SampleAuthor[];
}

async function main() {
  console.log("🌱 Starting BookLeaf database seeding...");

  // 1. Read exact sample data file
  const jsonPath = path.join(process.cwd(), "data", "bookleaf_sample_data.json");
  if (!fs.existsSync(jsonPath)) {
    throw new Error(`Sample data file not found at: ${jsonPath}`);
  }
  const rawData = fs.readFileSync(jsonPath, "utf8");
  const data: SampleData = JSON.parse(rawData);

  // 2. Hash passwords
  const authorPasswordHash = await bcrypt.hash("Author@123", 10);
  const adminPasswordHash = await bcrypt.hash("Admin@123", 10);

  // 3. Create Admins
  console.log("Creating admin accounts...");
  const adminLead = await prisma.user.upsert({
    where: { email: "admin@bookleafpub.com" },
    update: {
      name: "Ops Lead",
      role: Role.ADMIN,
      passwordHash: adminPasswordHash,
    },
    create: {
      email: "admin@bookleafpub.com",
      name: "Ops Lead",
      role: Role.ADMIN,
      passwordHash: adminPasswordHash,
    },
  });

  const adminSupport = await prisma.user.upsert({
    where: { email: "support@bookleafpub.com" },
    update: {
      name: "Support Exec",
      role: Role.ADMIN,
      passwordHash: adminPasswordHash,
    },
    create: {
      email: "support@bookleafpub.com",
      name: "Support Exec",
      role: Role.ADMIN,
      passwordHash: adminPasswordHash,
    },
  });

  console.log(`Created admins: ${adminLead.email}, ${adminSupport.email}`);

  // 4. Create Authors and Books from JSON
  console.log(`Seeding ${data.authors.length} authors and their books...`);
  const authorMap = new Map<string, string>(); // email -> userId
  const bookMap = new Map<string, string>(); // externalId -> bookId

  for (const author of data.authors) {
    const user = await prisma.user.upsert({
      where: { email: author.email },
      update: {
        name: author.name,
        phone: author.phone,
        city: author.city,
        joinedAt: new Date(author.joined_date),
        role: Role.AUTHOR,
      },
      create: {
        email: author.email,
        name: author.name,
        passwordHash: authorPasswordHash,
        phone: author.phone,
        city: author.city,
        joinedAt: new Date(author.joined_date),
        role: Role.AUTHOR,
      },
    });

    authorMap.set(author.email, user.id);

    for (const book of author.books) {
      const createdBook = await prisma.book.upsert({
        where: { externalId: book.book_id },
        update: {
          title: book.title,
          isbn: book.isbn,
          genre: book.genre,
          publicationDate: book.publication_date ? new Date(book.publication_date) : null,
          status: book.status,
          mrp: book.mrp,
          royaltyPerCopy: book.author_royalty_per_copy,
          copiesSold: book.total_copies_sold,
          royaltyEarned: book.total_royalty_earned,
          royaltyPaid: book.royalty_paid,
          royaltyPending: book.royalty_pending,
          lastPayoutDate: book.last_royalty_payout_date
            ? new Date(book.last_royalty_payout_date)
            : null,
          printPartner: book.print_partner,
          availableOn: book.available_on,
        },
        create: {
          externalId: book.book_id,
          authorId: user.id,
          title: book.title,
          isbn: book.isbn,
          genre: book.genre,
          publicationDate: book.publication_date ? new Date(book.publication_date) : null,
          status: book.status,
          mrp: book.mrp,
          royaltyPerCopy: book.author_royalty_per_copy,
          copiesSold: book.total_copies_sold,
          royaltyEarned: book.total_royalty_earned,
          royaltyPaid: book.royalty_paid,
          royaltyPending: book.royalty_pending,
          lastPayoutDate: book.last_royalty_payout_date
            ? new Date(book.last_royalty_payout_date)
            : null,
          printPartner: book.print_partner,
          availableOn: book.available_on,
        },
      });

      bookMap.set(book.book_id, createdBook.id);
    }
  }

  // 5. Seed ~12 Demo Tickets with realistic age, categories, priorities and replies
  console.log("Seeding demo tickets...");

  const ananyaId = authorMap.get("ananya.reddy@email.com")!;
  const snehaId = authorMap.get("sneha.kulkarni@email.com")!;
  const diyaId = authorMap.get("diya.chatterjee@email.com")!;
  const arjunId = authorMap.get("arjun.malhotra@email.com")!;
  const rohitId = authorMap.get("rohit.kapoor@email.com")!;
  const priyaId = authorMap.get("priya.sharma@email.com")!;
  const kavitaId = authorMap.get("kavita.deshmukh@email.com")!;
  const vikramId = authorMap.get("vikram.joshi@email.com")!;

  // Clean existing tickets and messages for clean idempotency
  await prisma.internalNote.deleteMany();
  await prisma.ticketMessage.deleteMany();
  await prisma.aiCallLog.deleteMany();
  await prisma.ticket.deleteMany();

  const now = new Date();
  const daysAgo = (days: number, hours = 0) =>
    new Date(now.getTime() - (days * 24 + hours) * 60 * 60 * 1000);

  // Ticket 1: Ananya Reddy (No royalty yet, published 2024-07, 0 paid) -> CRITICAL
  const t1 = await prisma.ticket.create({
    data: {
      authorId: ananyaId,
      bookId: bookMap.get("BK005"),
      subject: "Haven't received any royalty payout yet",
      description:
        "I published my book Between Two Temples in July 2024 and it's been several months now. My dashboard shows ₹0 paid but 200 copies sold. Could you please check when I will receive my payout?",
      category: Category.ROYALTY_PAYMENTS,
      aiCategory: Category.ROYALTY_PAYMENTS,
      priority: Priority.CRITICAL,
      aiPriority: Priority.CRITICAL,
      aiConfidence: 0.96,
      aiReason: "Unpaid royalty months past publication date with ₹0 paid",
      aiState: AiState.DONE,
      status: TicketStatus.OPEN,
      createdAt: daysAgo(7, 2),
      draftResponse:
        "Dear Ananya,\n\nThank you for reaching out, and I completely understand your concern regarding your royalty payout for Between Two Temples.\n\nLooking into your account, your book has sold 200 copies with ₹4,000 in earned royalties, and our records show ₹0 disbursed to date. Since your publication was in July 2024, your earnings for Q3 (July-September) were finalized in October and scheduled for payout within 45 days.\n\nI have escalated this payment delay directly to our finance desk with a strict 48-hour resolution timeline. Please ensure your bank details and IFSC code in your dashboard are active so we can process the pending transfer immediately.\n\nWarm regards,\nTeam BookLeaf",
      draftState: AiState.DONE,
    },
  });

  // Ticket 2: Sneha Kulkarni (Midnight in Mysore in production) -> HIGH
  const t2 = await prisma.ticket.create({
    data: {
      authorId: snehaId,
      bookId: bookMap.get("BK013"),
      subject: "Update on typesetting and cover proof",
      description:
        "It has been over 3 weeks since I submitted my revised manuscript for Midnight in Mysore. The status still shows In Production - Cover Design. When will the typesetting proof be ready for review?",
      category: Category.BOOK_STATUS_PRODUCTION,
      aiCategory: Category.BOOK_STATUS_PRODUCTION,
      priority: Priority.HIGH,
      aiPriority: Priority.HIGH,
      aiConfidence: 0.93,
      aiReason: "Author inquiring about 3-week stalled production stage",
      aiState: AiState.DONE,
      status: TicketStatus.IN_PROGRESS,
      assignedToId: adminSupport.id,
      firstRespondedAt: daysAgo(3, 10),
      createdAt: daysAgo(4, 5),
      draftResponse:
        "Dear Sneha,\n\nThank you for following up on Midnight in Mysore. I understand waiting for production updates can be anxious.\n\nOur design partner Epitome Books completed your revised front cover jacket yesterday, and the manuscript is now undergoing typesetting proofing. You will receive the PDF interior proof directly at your registered email within 3 business days.\n\nWarm regards,\nTeam BookLeaf",
      draftState: AiState.DONE,
      messages: {
        create: [
          {
            sender: MessageSender.ADMIN,
            authorUserId: adminSupport.id,
            body: "Hi Sneha, thanks for following up! Our design partner completed your revised front cover yesterday, and the interior layout is in final typesetting. You will receive the interior proof to approve within 3 business days.",
            createdAt: daysAgo(3, 10),
          },
        ],
      },
      internalNotes: {
        create: [
          {
            adminId: adminLead.id,
            body: "Epitome Books confirmed the spine thickness recalculation was finished. Typesetting ETA is Wednesday.",
            createdAt: daysAgo(3, 12),
          },
        ],
      },
    },
  });

  // Ticket 3: Diya Chatterjee (ISBN Mismatch) -> CRITICAL
  const t3 = await prisma.ticket.create({
    data: {
      authorId: diyaId,
      bookId: bookMap.get("BK017"),
      subject: "Different ISBN showing on Amazon India than physical copy",
      description:
        "My printed copies arrived with ISBN 978-93-5XXXX-17-2, but Amazon India is displaying a completely different ISBN 978-93-5XXXX-99-9 under my title Durga's Daughters. Readers are confused and reviews might split.",
      category: Category.ISBN_METADATA,
      aiCategory: Category.ISBN_METADATA,
      priority: Priority.CRITICAL,
      aiPriority: Priority.CRITICAL,
      aiConfidence: 0.98,
      aiReason: "Critical ISBN metadata divergence on live marketplace",
      aiState: AiState.DONE,
      status: TicketStatus.OPEN,
      createdAt: daysAgo(2, 6),
      draftResponse:
        "Dear Diya,\n\nThank you for bringing this to our attention immediately. Having an ISBN mismatch on Amazon is a serious catalog issue, and we treat it with top priority.\n\nI have confirmed your physical imprint ISBN is 978-93-5XXXX-17-2. I am escalating this right now to our cataloging and production team to push an urgent metadata correction to Amazon India. We will resolve this within 48 hours and update you as soon as the feed refreshes.\n\nWarm regards,\nTeam BookLeaf",
      draftState: AiState.DONE,
    },
  });

  // Ticket 4: Arjun Malhotra (Low Royalty explanation) -> MEDIUM
  const t4 = await prisma.ticket.create({
    data: {
      authorId: arjunId,
      bookId: bookMap.get("BK009"),
      subject: "Royalty amount seems lower than expected for 200 copies",
      description:
        "I noticed my last quarterly payout was ₹3,000 for about 200 copies sold. According to the ₹35 royalty per copy, shouldn't it be higher? Could you explain the net profit deduction?",
      category: Category.ROYALTY_PAYMENTS,
      aiCategory: Category.ROYALTY_PAYMENTS,
      priority: Priority.MEDIUM,
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.91,
      aiReason: "Inquiry on royalty split formula and platform deductions",
      aiState: AiState.DONE,
      status: TicketStatus.IN_PROGRESS,
      assignedToId: adminLead.id,
      firstRespondedAt: daysAgo(2, 1),
      createdAt: daysAgo(3, 4),
      messages: {
        create: [
          {
            sender: MessageSender.ADMIN,
            authorUserId: adminLead.id,
            body: "Hi Arjun, happy to clarify! BookLeaf follows an 80/20 net profit split: 80% of net profit goes to the author. Net profit is calculated after subtracting print cost, platform commission (Amazon/Flipkart ~40%), and courier charges. I have generated your itemized sales statement and emailed it to you.",
            createdAt: daysAgo(2, 1),
          },
        ],
      },
    },
  });

  // Ticket 5: Rohit Kapoor (Distribution Availability) -> HIGH
  const t5 = await prisma.ticket.create({
    data: {
      authorId: rohitId,
      bookId: bookMap.get("BK003"),
      subject: "Code & Karma showing Currently Unavailable on Amazon India",
      description:
        "Multiple readers have messaged me saying Code & Karma is marked out of stock / Currently Unavailable on Amazon India, although Flipkart is working. Can you please re-sync inventory?",
      category: Category.DISTRIBUTION_AVAILABILITY,
      aiCategory: Category.DISTRIBUTION_AVAILABILITY,
      priority: Priority.HIGH,
      aiPriority: Priority.HIGH,
      aiConfidence: 0.94,
      aiReason: "Live book out of stock / inventory sync glitch on Amazon",
      aiState: AiState.DONE,
      status: TicketStatus.OPEN,
      createdAt: daysAgo(1, 4),
    },
  });

  // Ticket 6: Priya Sharma (Printing Quality) -> RESOLVED
  const t6 = await prisma.ticket.create({
    data: {
      authorId: priyaId,
      bookId: bookMap.get("BK001"),
      subject: "Defective author copies received - blurry cover and misaligned margins",
      description:
        "I received 20 author copies from the recent print batch. Several copies have misaligned margins and blurry front cover colors. I have photos ready to share.",
      category: Category.PRINTING_QUALITY,
      aiCategory: Category.PRINTING_QUALITY,
      priority: Priority.HIGH,
      aiPriority: Priority.HIGH,
      aiConfidence: 0.95,
      aiReason: "Defective physical copies delivered to author",
      aiState: AiState.DONE,
      status: TicketStatus.RESOLVED,
      assignedToId: adminSupport.id,
      firstRespondedAt: daysAgo(5, 12),
      resolvedAt: daysAgo(1, 0),
      createdAt: daysAgo(6, 8),
      messages: {
        create: [
          {
            sender: MessageSender.ADMIN,
            authorUserId: adminSupport.id,
            body: "Dear Priya, we sincerely apologize for this quality issue. We have dispatched a free reprint of all 20 copies directly from our Delhi press via BlueDart Express (tracking #BL994821).",
            createdAt: daysAgo(5, 12),
          },
          {
            sender: MessageSender.AUTHOR,
            authorUserId: priyaId,
            body: "Thank you so much! Received the replacement copies today and they look immaculate.",
            createdAt: daysAgo(1, 2),
          },
        ],
      },
    },
  });

  // Ticket 7: Priya Sharma (General Metadata) -> CLOSED
  const t7 = await prisma.ticket.create({
    data: {
      authorId: priyaId,
      bookId: bookMap.get("BK002"),
      subject: "Updating book description and author bio on Amazon",
      description:
        "I would like to update the blurb on the Amazon listing to highlight our recent literary award mention. How can I submit the revised text?",
      category: Category.GENERAL_INQUIRY,
      aiCategory: Category.GENERAL_INQUIRY,
      priority: Priority.LOW,
      aiPriority: Priority.LOW,
      aiConfidence: 0.89,
      aiReason: "Cosmetic description change request",
      aiState: AiState.DONE,
      status: TicketStatus.CLOSED,
      assignedToId: adminLead.id,
      firstRespondedAt: daysAgo(7, 4),
      resolvedAt: daysAgo(3, 0),
      createdAt: daysAgo(8, 0),
      messages: {
        create: [
          {
            sender: MessageSender.ADMIN,
            authorUserId: adminLead.id,
            body: "Hi Priya! Congratulations on the award! You can email the new blurb text directly to ops@bookleafpub.com. Once submitted, our team will push it to Amazon and Flipkart within 3-5 business days.",
            createdAt: daysAgo(7, 4),
          },
        ],
      },
    },
  });

  // Ticket 8: Kavita Patel (₹850 Pending Rollover) -> RESOLVED
  const t8 = await prisma.ticket.create({
    data: {
      authorId: kavitaId,
      bookId: bookMap.get("BK012"),
      subject: "Query regarding ₹850 pending royalty for The Nagpur Notebooks",
      description:
        "My dashboard shows ₹850 in pending royalties for the last quarter. Was this transferred, or does it roll over because it is under ₹1,000?",
      category: Category.ROYALTY_PAYMENTS,
      aiCategory: Category.ROYALTY_PAYMENTS,
      priority: Priority.LOW,
      aiPriority: Priority.LOW,
      aiConfidence: 0.92,
      aiReason: "Question regarding minimum payout threshold of ₹1000",
      aiState: AiState.DONE,
      status: TicketStatus.RESOLVED,
      assignedToId: adminLead.id,
      firstRespondedAt: daysAgo(4, 2),
      resolvedAt: daysAgo(2, 5),
      createdAt: daysAgo(5, 3),
      messages: {
        create: [
          {
            sender: MessageSender.ADMIN,
            authorUserId: adminLead.id,
            body: "Hi Kavita, BookLeaf has a minimum payout threshold of ₹1,000. Because your current pending earnings stand at ₹850, it automatically rolls over into the upcoming quarter and will be disbursed as soon as your total reaches ₹1,000.",
            createdAt: daysAgo(4, 2),
          },
        ],
      },
    },
  });

  // Ticket 9: Rohit Kapoor (Distribution Inquiry) -> OPEN
  const t9 = await prisma.ticket.create({
    data: {
      authorId: rohitId,
      bookId: bookMap.get("BK004"),
      subject: "Distribution expansion to Barnes & Noble",
      description:
        "Can Startup Sutra also be listed on Barnes & Noble international catalog through the Bestseller Breakthrough package?",
      category: Category.DISTRIBUTION_AVAILABILITY,
      aiCategory: Category.DISTRIBUTION_AVAILABILITY,
      priority: Priority.MEDIUM,
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.88,
      aiReason: "New distribution channel expansion inquiry",
      aiState: AiState.DONE,
      status: TicketStatus.OPEN,
      createdAt: daysAgo(0, 14),
    },
  });

  // Ticket 10: Diya Chatterjee (Printing Defects) -> IN_PROGRESS
  const t10 = await prisma.ticket.create({
    data: {
      authorId: diyaId,
      bookId: bookMap.get("BK018"),
      subject: "Paperback binding defect in 5 copies of Howrah Nights",
      description:
        "5 of my author copies had the spine unglued on the first opening. Please arrange for replacement copies.",
      category: Category.PRINTING_QUALITY,
      aiCategory: Category.PRINTING_QUALITY,
      priority: Priority.HIGH,
      aiPriority: Priority.HIGH,
      aiConfidence: 0.95,
      aiReason: "Binding defect complaint on author copies",
      aiState: AiState.DONE,
      status: TicketStatus.IN_PROGRESS,
      assignedToId: adminSupport.id,
      firstRespondedAt: daysAgo(1, 3),
      createdAt: daysAgo(3, 1),
      messages: {
        create: [
          {
            sender: MessageSender.ADMIN,
            authorUserId: adminSupport.id,
            body: "Dear Diya, please accept our apologies. We have flagged this with Epitome Books and submitted an order for 5 replacement copies today.",
            createdAt: daysAgo(1, 3),
          },
        ],
      },
    },
  });

  // Ticket 11: Ananya Reddy (General Account / Bank Details) -> OPEN
  const t11 = await prisma.ticket.create({
    data: {
      authorId: ananyaId,
      bookId: null, // General / Account Level
      subject: "Update bank account details for direct transfer",
      description:
        "I have changed my primary bank account. Where in my dashboard can I update the IFSC and account number for future payouts?",
      category: Category.GENERAL_INQUIRY,
      aiCategory: Category.GENERAL_INQUIRY,
      priority: Priority.LOW,
      aiPriority: Priority.LOW,
      aiConfidence: 0.93,
      aiReason: "Account profile and banking update query",
      aiState: AiState.DONE,
      status: TicketStatus.OPEN,
      createdAt: daysAgo(0, 6),
    },
  });

  // Ticket 12: Vikram Malhotra (Distribution Search Issue) -> OPEN
  const t12 = await prisma.ticket.create({
    data: {
      authorId: vikramId,
      bookId: bookMap.get("BK006"),
      subject: "The Silent Valley missing from Flipkart search results",
      description:
        "Searching for 'The Silent Valley' on Flipkart shows no results, even though the direct link was working last week. Please check the listing indexing.",
      category: Category.DISTRIBUTION_AVAILABILITY,
      aiCategory: Category.DISTRIBUTION_AVAILABILITY,
      priority: Priority.MEDIUM,
      aiPriority: Priority.MEDIUM,
      aiConfidence: 0.91,
      aiReason: "Platform search indexing issue on Flipkart",
      aiState: AiState.DONE,
      status: TicketStatus.OPEN,
      createdAt: daysAgo(2, 1),
    },
  });

  console.log(`✅ Seeded 12 demo tickets covering all categories and statuses!`);
  console.log("🎉 Database seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
