import { NextRequest, NextResponse } from "next/server";
import { handleRoute } from "@/lib/http/handleRoute";
import { requireAdmin } from "@/lib/auth/guards";
import { getOrGenerateTicketDraft } from "@/lib/ai/draft";

export const POST = handleRoute(async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  await requireAdmin(req);
  const { id } = await params;

  let force = false;
  try {
    const body = await req.json();
    force = body.force === true;
  } catch {
    // Body is optional
  }

  const result = await getOrGenerateTicketDraft(id, { force });

  return NextResponse.json({
    draft: result.draft,
    source: result.source,
    cached: result.cached,
    generatedAt: result.generatedAt,
  });
});
