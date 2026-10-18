import React from "react";
import { getSession } from "@/lib/auth/guards";
import { AuthorNav } from "@/components/author/AuthorNav";

export const instant = false;

export default async function AuthorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF5F6] relative overflow-hidden">
      {/* Decorative soft coral blob */}
      <div className="bg-blob-coral" />

      <AuthorNav
        user={
          session
            ? {
                name: session.name,
                email: session.email,
              }
            : undefined
        }
      />

      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-8 relative z-10">
        {children}
      </main>

      <footer className="w-full border-t border-[#F3C9D0] bg-white/60 py-6 text-center text-xs text-[#8A94A3] relative z-10">
        <p>© 2026 BookLeaf Publishing. Author Support & Communication Portal.</p>
      </footer>
    </div>
  );
}
