"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { LogOut, Inbox, ExternalLink, Bot } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface AdminNavProps {
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

export function AdminNav({ user }: AdminNavProps) {
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

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#E8ECF2] shadow-sm">
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Logo subtitle="Support Workbench" href="/admin" size="sm" />

          {/* Center Links */}
          <nav className="hidden sm:flex items-center gap-2">
            <Link
              href="/admin"
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-bold tracking-wide transition-colors ${
                pathname === "/admin"
                  ? "bg-[#EBF7F9] text-[#4FB3C8]"
                  : "text-[#556070] hover:text-[#2E3A4B] hover:bg-[#F8F9FA]"
              }`}
            >
              <Inbox className="w-4 h-4" />
              <span>Ticket Queue</span>
            </Link>

            <Link
              href="/author"
              target="_blank"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-[#8A94A3] hover:text-[#2E3A4B] hover:bg-[#F8F9FA] transition-colors"
              title="Open author portal preview in new tab"
            >
              <span>Author Portal</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </nav>
        </div>

        {/* Right info & actions */}
        <div className="flex items-center gap-3">
          {/* AI Status Chip */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EBF7F9] border border-[#C5EAF0] text-[#1E7485] text-xs font-medium">
            <Bot className="w-3.5 h-3.5 text-[#4FB3C8]" />
            <span>AI Triage Active</span>
          </div>

          {user && (
            <div className="hidden sm:flex items-center gap-2 text-right">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#2E3A4B]">{user.name}</span>
                <span className="text-[10px] text-[#8A94A3] truncate max-w-[120px]">
                  {user.email}
                </span>
              </div>
              <Badge variant="teal" size="sm">
                Admin
              </Badge>
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
