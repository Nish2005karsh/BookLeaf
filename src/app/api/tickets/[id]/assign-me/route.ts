import { NextRequest, NextResponse } from "next/server";
import { handleRoute } from "@/lib/http/handleRoute";
import { requireAuth } from "@/lib/auth/guards";
import { ticketService } from "@/server/services/ticketService";
import { Role } from "@prisma/client";

export const POST = handleRoute(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireAuth(req, Role.ADMIN);
    const { id } = await params;

    const ticket = await ticketService.assignToAdmin(id, user);
    return NextResponse.json({ ticket });
  }
);
