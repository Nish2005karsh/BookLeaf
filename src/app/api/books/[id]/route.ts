import { NextRequest, NextResponse } from "next/server";
import { handleRoute } from "@/lib/http/handleRoute";
import { requireAuth } from "@/lib/auth/guards";
import { bookService } from "@/server/services/bookService";

export const GET = handleRoute(
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const user = await requireAuth(req);
    const { id } = await params;

    const book = await bookService.getBookById(id, user);
    return NextResponse.json({ book });
  }
);
