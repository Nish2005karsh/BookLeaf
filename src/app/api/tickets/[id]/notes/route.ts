import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleRoute } from "@/lib/http/handleRoute";
import { requireAuth } from "@/lib/auth/guards";
import { ticketService } from "@/server/services/ticketService";
import { Role } from "@prisma/client";

const noteSchema = z.object({
  body: z.string().min(1, "Internal note cannot be empty"),
});

export const POST = handleRoute(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireAuth(req, Role.ADMIN);
    const { id } = await params;
    const json = await req.json();
    const parsed = noteSchema.parse(json);

    const note = await ticketService.addInternalNote(id, parsed.body, user);
    return NextResponse.json({ note }, { status: 201 });
  }
);
