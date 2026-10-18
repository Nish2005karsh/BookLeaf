import React from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlusCircle, MessageSquare, ChevronRight, Calendar } from "lucide-react";

export const instant = false;

export default async function AuthorTicketsListPage() {
  const session = await getSession();
  if (!session) return null;

  const tickets = await prisma.ticket.findMany({
    where: { authorId: session.userId },
    orderBy: { createdAt: "desc" },
    include: {
      book: {
        select: { title: true, externalId: true },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#2E3A4B]">My Support Queries</h1>
          <p className="text-sm text-[#8A94A3] mt-1">
            Track all your queries, follow-up messages, and updates from BookLeaf support.
          </p>
        </div>
        <Link href="/author/tickets/new">
          <Button variant="primary" size="md" className="gap-2">
            <PlusCircle className="w-4 h-4" />
            <span>Raise a Query</span>
          </Button>
        </Link>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          title="No queries raised"
          description="You haven't submitted any support queries yet. If you have any questions regarding your royalties, books, or distribution, raise one anytime."
          actionText="Raise a Query"
          onAction={() => {}}
        />
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => {
            const lastMessage = ticket.messages[0];
            const hasAdminReply = lastMessage?.sender === "ADMIN";

            return (
              <Link
                key={ticket.id}
                href={`/author/tickets/${ticket.id}`}
                className="block group"
              >
                <Card
                  interactive
                  className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                >
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-mono font-bold bg-[#DFF3F7] text-[#3A97AB] px-2.5 py-0.5 rounded-md">
                        BL-{ticket.number}
                      </span>
                      <StatusBadge status={ticket.status} />

                      {ticket.book && (
                        <span className="text-xs text-[#8A94A3] font-medium truncate max-w-[250px]">
                          • {ticket.book.title} ({ticket.book.externalId})
                        </span>
                      )}

                      {/* Unread Admin reply pill */}
                      {hasAdminReply && ticket.status !== "RESOLVED" && ticket.status !== "CLOSED" && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#DCFCE7] text-[#15803D]">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#2FA36B] animate-pulse" />
                          <span>New reply from team</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-[#2E3A4B] group-hover:text-[#F2697A] transition-colors truncate">
                      {ticket.subject}
                    </h3>

                    <p className="text-xs text-[#556070] line-clamp-1">
                      {lastMessage ? lastMessage.body : ticket.description}
                    </p>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-[#F3C9D0]/30 text-right">
                    <span className="text-xs text-[#8A94A3] flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#8A94A3]" />
                      <span>
                        {new Date(ticket.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </span>

                    <span className="text-xs font-bold text-[#F2697A] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                      <span>View conversation</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
