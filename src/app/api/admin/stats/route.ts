import { NextRequest, NextResponse } from "next/server";
import { handleRoute } from "@/lib/http/handleRoute";
import { requireAuth } from "@/lib/auth/guards";
import { ticketService } from "@/server/services/ticketService";
import { Role } from "@prisma/client";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireAuth(req, Role.ADMIN);
  const stats = await ticketService.getAdminStats();
  return NextResponse.json(stats);
});
