import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleRoute } from "@/lib/http/handleRoute";
import { requireAuth } from "@/lib/auth/guards";
import { ticketService } from "@/server/services/ticketService";
import { TicketStatus, Category, Priority } from "@prisma/client";

const createTicketSchema = z.object({
  subject: z
    .string()
    .min(5, "Subject must be at least 5 characters")
    .max(120, "Subject must not exceed 120 characters"),
  description: z
    .string()
    .min(20, "Description must be at least 20 characters")
    .max(4000, "Description must not exceed 4000 characters"),
  bookId: z.string().nullable().optional(),
  attachmentNames: z.array(z.string()).optional(),
});

export const POST = handleRoute(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const body = await req.json();
  const parsed = createTicketSchema.parse(body);

  const ticket = await ticketService.createTicket(
    {
      subject: parsed.subject,
      description: parsed.description,
      bookId: parsed.bookId,
      attachmentNames: parsed.attachmentNames,
    },
    user
  );

  return NextResponse.json({ ticket }, { status: 201 });
});

export const GET = handleRoute(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const searchParams = req.nextUrl.searchParams;

  const status = searchParams.get("status") as TicketStatus | null;
  const category = searchParams.get("category") as Category | null;
  const priority = searchParams.get("priority") as Priority | null;
  const assignedToParam = searchParams.get("assignedTo");

  let assignedToId: string | null | undefined = undefined;
  if (assignedToParam === "me") {
    assignedToId = user.userId;
  } else if (assignedToParam === "unassigned") {
    assignedToId = null;
  } else if (assignedToParam) {
    assignedToId = assignedToParam;
  }

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const search = searchParams.get("q") || undefined;
  const updatedSinceParam = searchParams.get("updatedSince");
  const sort = (searchParams.get("sort") as "urgency" | "newest" | "oldest") || "urgency";
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "50", 10);

  const result = await ticketService.listTickets(
    user,
    {
      status: status || undefined,
      category: category || undefined,
      priority: priority || undefined,
      assignedToId,
      from: fromParam ? new Date(fromParam) : undefined,
      to: toParam ? new Date(toParam) : undefined,
      search,
      updatedSince: updatedSinceParam ? new Date(updatedSinceParam) : undefined,
      sort,
    },
    { page, pageSize }
  );

  return NextResponse.json(result);
});
