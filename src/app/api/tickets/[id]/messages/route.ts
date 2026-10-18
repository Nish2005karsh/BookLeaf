import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { handleRoute } from "@/lib/http/handleRoute";
import { requireAuth } from "@/lib/auth/guards";
import { ticketService } from "@/server/services/ticketService";

const messageSchema = z.object({
  body: z.string().min(1, "Message cannot be empty").max(4000, "Message cannot exceed 4000 characters"),
});

export const POST = handleRoute(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireAuth(req);
    const { id } = await params;
    const json = await req.json();
    const parsed = messageSchema.parse(json);

    const message = await ticketService.addMessage(id, parsed.body, user);
    return NextResponse.json({ message }, { status: 201 });
  }
);
