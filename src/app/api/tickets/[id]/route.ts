import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleRoute } from "@/lib/http/handleRoute";
import { requireAuth } from "@/lib/auth/guards";
import { ticketService } from "@/server/services/ticketService";
import { Role, TicketStatus, Category, Priority } from "@prisma/client";

const patchTicketSchema = z.object({
  status: z.nativeEnum(TicketStatus).optional(),
  category: z.nativeEnum(Category).optional(),
  priority: z.nativeEnum(Priority).optional(),
  assignedToId: z.string().nullable().optional(),
});

export const GET = handleRoute(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireAuth(req);
    const { id } = await params;

    const ticket = await ticketService.getTicketById(id, user);
    return NextResponse.json({ ticket });
  }
);

export const PATCH = handleRoute(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireAuth(req, Role.ADMIN);
    const { id } = await params;
    const body = await req.json();
    const parsed = patchTicketSchema.parse(body);

    const ticket = await ticketService.updateTicketAdmin(id, parsed, user);
    return NextResponse.json({ ticket });
  }
);
