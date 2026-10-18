import { NextRequest, NextResponse } from "next/server";
import { handleRoute } from "@/lib/http/handleRoute";
import { requireAdmin } from "@/lib/auth/guards";
import { processTicketClassification } from "@/lib/ai/classify";
import { ticketService } from "@/server/services/ticketService";
import { NotFoundError } from "@/lib/http/errors";

export const POST = handleRoute(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const admin = await requireAdmin(req);
  const { id } = await params;

  const updated = await processTicketClassification(id);
  if (!updated) {
    throw new NotFoundError("Ticket not found");
  }

  // Return the full admin serialized ticket
  const ticket = await ticketService.getTicketById(id, admin);
  return NextResponse.json({ ticket });
});
