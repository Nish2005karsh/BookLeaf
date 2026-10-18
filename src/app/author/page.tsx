import React from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { StatStrip } from "@/components/ui/StatStrip";
import { Card, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  BookOpen,
  ShoppingBag,
  TrendingUp,
  Clock,
  PlusCircle,
  ArrowRight,
  MessageSquare,
} from "lucide-react";

export const instant = false;

export default async function AuthorDashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const [books, tickets] = await Promise.all([
    prisma.book.findMany({
      where: { authorId: session.userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ticket.findMany({
      where: { authorId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        book: {
          select: { title: true },
        },
      },
    }),
  ]);

  const totalCopiesSold = books.reduce((acc, b) => acc + b.copiesSold, 0);
  const totalRoyaltyEarned = books.reduce((acc, b) => acc + b.royaltyEarned, 0);
  const totalRoyaltyPending = books.reduce((acc, b) => acc + b.royaltyPending, 0);

  const firstName = session.name.split(" ")[0] || session.name;

  return (
    <div className="space-y-8">
      {/* Coral & Teal Hero StatStrip */}
      <StatStrip
        title={`Welcome back, ${firstName}!`}
        subtitle="Here is an overview of your published titles, royalties, and support queries."
        action={
          <Link href="/author/tickets/new">
            <Button variant="secondary" size="md" className="gap-2 shadow-md">
              <PlusCircle className="w-4 h-4" />
              <span>Raise a Query</span>
            </Button>
          </Link>
        }
        stats={[
          {
            label: "Books",
            value: books.length,
            icon: <BookOpen className="w-5 h-5" />,
          },
          {
            label: "Copies Sold",
            value: totalCopiesSold.toLocaleString("en-IN"),
            icon: <ShoppingBag className="w-5 h-5" />,
          },
          {
            label: "Royalty Earned",
            value: `₹${totalRoyaltyEarned.toLocaleString("en-IN")}`,
            icon: <TrendingUp className="w-5 h-5" />,
          },
          {
            label: "Royalty Pending",
            value: `₹${totalRoyaltyPending.toLocaleString("en-IN")}`,
            icon: <Clock className="w-5 h-5" />,
            hint: totalRoyaltyPending > 0 && totalRoyaltyPending < 1000 ? "Rolls over (< ₹1,000)" : undefined,
          },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Recent Queries (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-[#2E3A4B]">Recent Support Queries</h2>
            <Link
              href="/author/tickets"
              className="text-xs font-bold text-[#F2697A] hover:text-[#E04F62] flex items-center gap-1"
            >
              <span>View all queries</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {tickets.length === 0 ? (
            <EmptyState
              title="No queries raised yet"
              description="Have questions about your royalty payouts, distribution, or print quality? Our operations team is here to assist."
              actionText="Raise your first query"
              onAction={() => {}}
            />
          ) : (
            <div className="space-y-3">
              {tickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  href={`/author/tickets/${ticket.id}`}
                  className="block group"
                >
                  <Card
                    interactive
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-[#4FB3C8] bg-[#DFF3F7] px-2 py-0.5 rounded-md">
                          BL-{ticket.number}
                        </span>
                        <StatusBadge status={ticket.status} />
                        {ticket.book && (
                          <span className="text-xs text-[#8A94A3] truncate max-w-[200px]">
                            • {ticket.book.title}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-bold text-[#2E3A4B] group-hover:text-[#F2697A] transition-colors truncate">
                        {ticket.subject}
                      </h3>
                      <p className="text-xs text-[#8A94A3] line-clamp-1">
                        {ticket.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs text-[#8A94A3]">
                        {new Date(ticket.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Quick Shortcuts & Guidance */}
        <div className="space-y-6">
          <Card className="p-6 bg-white border border-[#F3C9D0]">
            <CardHeader
              title="Your Catalog"
              subtitle={`${books.length} published or in-production title(s)`}
              icon={<BookOpen className="w-5 h-5" />}
              action={
                <Link href="/author/books">
                  <Button variant="ghost" size="sm" className="!h-8 !px-3 text-xs">
                    View
                  </Button>
                </Link>
              }
            />
            <div className="space-y-3 mt-4 divide-y divide-[#F3C9D0]/30">
              {books.slice(0, 3).map((book) => (
                <div key={book.id} className="pt-3 first:pt-0">
                  <h4 className="text-sm font-bold text-[#2E3A4B] truncate">{book.title}</h4>
                  <div className="flex items-center justify-between text-xs text-[#8A94A3] mt-1">
                    <span>{book.genre}</span>
                    <span className="font-semibold text-[#4FB3C8]">{book.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-6 bg-[#DFF3F7]/50 border border-[#4FB3C8]/30">
            <h4 className="text-sm font-bold text-[#3A97AB] flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              <span>Need Help?</span>
            </h4>
            <p className="text-xs text-[#556070] mt-2 leading-relaxed">
              We respond to all author inquiries within 24–48 business hours. For urgent distribution
              or ISBN discrepancies, our dedicated ops team escalates directly to printing and catalog partners.
            </p>
            <div className="mt-4">
              <Link href="/author/tickets/new">
                <Button variant="primary" size="sm" className="w-full">
                  Create Support Ticket
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
