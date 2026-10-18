import { NextRequest, NextResponse } from "next/server";
import { handleRoute } from "@/lib/http/handleRoute";
import { requireAuth } from "@/lib/auth/guards";
import { bookService } from "@/server/services/bookService";

export const GET = handleRoute(async (req: NextRequest) => {
  const user = await requireAuth(req);
  const authorId = req.nextUrl.searchParams.get("authorId") || undefined;

  const books = await bookService.getBooks(user, authorId);
  return NextResponse.json({ books });
});
