import React from "react";
import { getSession } from "@/lib/auth/guards";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";
import { Role } from "@prisma/client";

export const instant = false;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.role !== Role.ADMIN) {
    redirect("/login?next=/admin");
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F9FA] relative">
      <AdminNav
        user={{
          name: session.name,
          email: session.email,
          role: session.role,
        }}
      />

      <main className="flex-1 w-full max-w-[1400px] mx-auto px-4 sm:px-6 py-8 relative z-10">
        {children}
      </main>

      <footer className="w-full border-t border-[#E8ECF2] bg-white py-4 text-center text-xs text-[#8A94A3] relative z-10">
        <p>© 2026 BookLeaf Publishing • Internal Support Operations</p>
      </footer>
    </div>
  );
}
