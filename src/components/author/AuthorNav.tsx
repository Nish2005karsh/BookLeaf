"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { LogOut, BookOpen, MessageSquare, LayoutDashboard } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function AuthorNav({ user }: { user?: { name: string; email: string } }) {
  const pathname = usePathname();
  const router = useRouter();
  const { success } = useToast();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      success("Logged out successfully");
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const navLinks = [
    { href: "/author", label: "Dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { href: "/author/books", label: "My Books", icon: <BookOpen className="w-4 h-4" /> },
    { href: "/author/tickets", label: "My Tickets", icon: <MessageSquare className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#F3C9D0] shadow-sm">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Logo subtitle="Author Portal" href="/author" size="sm" />

        {/* Center Nav Links */}
        <nav className="hidden sm:flex items-center gap-1 md:gap-2">
          {navLinks.map((link) => {
            const isActive =
              link.href === "/author"
                ? pathname === "/author"
                : pathname.startsWith(link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold tracking-wide transition-colors ${
                  isActive
                    ? "bg-[#FDE4E8] text-[#F2697A]"
                    : "text-[#556070] hover:text-[#2E3A4B] hover:bg-[#FFF5F6]"
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right User & Actions */}
        <div className="flex items-center gap-3">
          <Link href="/author/tickets/new">
            <Button variant="primary" size="sm" className="hidden xs:inline-flex">
              Raise a Query
            </Button>
          </Link>

          {user && (
            <div className="hidden md:flex flex-col text-right leading-tight">
              <span className="text-xs font-bold text-[#2E3A4B]">{user.name}</span>
              <span className="text-[10px] text-[#8A94A3] truncate max-w-[120px]">
                {user.email}
              </span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            title="Log Out"
            className="!px-2.5 !h-9 text-[#D9435A] hover:bg-[#FDE4E8]/50 border-[#F3C9D0]"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
