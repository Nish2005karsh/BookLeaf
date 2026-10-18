import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleRoute } from "@/lib/http/handleRoute";
import { requireAuth } from "@/lib/auth/guards";
import { Role } from "@prisma/client";

export const GET = handleRoute(async (req: NextRequest) => {
  await requireAuth(req, Role.ADMIN);
  const roleParam = req.nextUrl.searchParams.get("role") as Role | null;

  const users = await prisma.user.findMany({
    where: roleParam ? { role: roleParam } : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
});
