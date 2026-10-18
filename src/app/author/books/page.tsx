import React from "react";
import Link from "next/link";
import { getSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProductionStepper } from "@/components/author/ProductionStepper";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  BookOpen,
  Calendar,
  Barcode,
  ShoppingBag,
  IndianRupee,
  MessageSquarePlus,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

export const instant = false;

export default async function AuthorBooksPage() {
  const session = await getSession();
  if (!session) return null;

  const books = await prisma.book.findMany({
    where: { authorId: session.userId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#2E3A4B]">My Books</h1>
          <p className="text-sm text-[#8A94A3] mt-1">
            Manage your published catalog, view royalty accruals, and monitor in-production stages.
          </p>
        </div>
        <Link href="/author/tickets/new">
          <Button variant="primary" size="md" className="gap-2 shrink-0">
            <MessageSquarePlus className="w-4 h-4" />
            <span>Raise Query</span>
          </Button>
        </Link>
      </div>

      {books.length === 0 ? (
        <EmptyState
          title="No books registered yet"
          description="Your published titles and titles currently undergoing production will appear here."
          actionText="Contact Support"
          onAction={() => {}}
        />
      ) : (
        <div className="space-y-6">
          {books.map((book) => {
            const inProduction = book.status.toLowerCase().includes("production");
            const hasPendingRollover = book.royaltyPending > 0 && book.royaltyPending < 1000;
            const hasZeroPaidPending = book.royaltyPaid === 0 && book.royaltyPending > 0;

            return (
              <Card key={book.id} className="p-6 md:p-8 space-y-6">
                {/* Header row */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-[#F3C9D0]/50 pb-5">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-[#DFF3F7] text-[#3A97AB] px-2 py-0.5 rounded-md">
                        {book.externalId}
                      </span>
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                          inProduction
                            ? "bg-[#FEF3C7] text-[#B45309]"
                            : "bg-[#DCFCE7] text-[#15803D]"
                        }`}
                      >
                        {book.status}
                      </span>
                      <span className="text-xs text-[#8A94A3] font-medium">
                        {book.genre}
                      </span>
                    </div>

                    <h2 className="text-xl md:text-2xl font-black text-[#2E3A4B]">
                      {book.title}
                    </h2>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-[#556070] pt-1">
                      <span className="flex items-center gap-1.5">
                        <Barcode className="w-4 h-4 text-[#8A94A3]" />
                        <span>ISBN: {book.isbn || "Pending Assignment"}</span>
                      </span>

                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[#8A94A3]" />
                        <span>
                          Published:{" "}
                          {book.publicationDate
                            ? new Date(book.publicationDate).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "In Production"}
                        </span>
                      </span>

                      {book.printPartner && (
                        <span className="text-[#8A94A3]">
                          Print: <strong className="text-[#556070]">{book.printPartner}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-2">
                    <Link href={`/author/tickets/new?bookId=${book.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1.5 !h-9 text-xs">
                        <MessageSquarePlus className="w-3.5 h-3.5" />
                        <span>Ask About This Book</span>
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* In-Production Stepper Banner */}
                {inProduction && (
                  <div className="bg-[#FFF5F6] p-4 rounded-[12px] border border-[#F3C9D0] space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#F2697A] uppercase tracking-wide">
                      <AlertCircle className="w-4 h-4" />
                      <span>Live Production Pipeline Progress</span>
                    </div>
                    <ProductionStepper currentStatus={book.status} />
                  </div>
                )}

                {/* Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-[#FFF5F6]/60 p-4 rounded-[12px] border border-[#F3C9D0]/40">
                  <div>
                    <span className="text-[11px] font-semibold text-[#8A94A3] uppercase tracking-wider">
                      MRP / Copy
                    </span>
                    <p className="text-lg font-bold text-[#2E3A4B] mt-0.5">
                      {book.mrp ? `₹${book.mrp}` : "-"}
                    </p>
                    <span className="text-[10px] text-[#8A94A3]">
                      {book.royaltyPerCopy ? `₹${book.royaltyPerCopy} royalty/copy` : "TBD"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#8A94A3] uppercase tracking-wider">
                      Copies Sold
                    </span>
                    <p className="text-lg font-bold text-[#2E3A4B] mt-0.5">
                      {inProduction ? "-" : book.copiesSold.toLocaleString("en-IN")}
                    </p>
                    <span className="text-[10px] text-[#8A94A3]">Total net verified</span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#8A94A3] uppercase tracking-wider">
                      Royalty Earned
                    </span>
                    <p className="text-lg font-bold text-[#2E3A4B] mt-0.5">
                      {inProduction ? "-" : `₹${book.royaltyEarned.toLocaleString("en-IN")}`}
                    </p>
                    <span className="text-[10px] text-[#2FA36B] font-medium">
                      {book.royaltyPaid > 0 ? `₹${book.royaltyPaid.toLocaleString("en-IN")} paid` : "₹0 paid"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-semibold text-[#8A94A3] uppercase tracking-wider">
                      Royalty Pending
                    </span>
                    <p className="text-lg font-bold text-[#F2697A] mt-0.5">
                      {inProduction ? "-" : `₹${book.royaltyPending.toLocaleString("en-IN")}`}
                    </p>
                    <span className="text-[10px] text-[#8A94A3]">
                      Next quarterly cycle
                    </span>
                  </div>
                </div>

                {/* Edge case callout notices */}
                {hasPendingRollover && (
                  <div className="flex items-center gap-2 p-3 rounded-[10px] bg-[#FEF3C7]/60 border border-[#FDE68A] text-xs text-[#B45309]">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#B45309]" />
                    <span>
                      Pending royalty is below the <strong>₹1,000 minimum threshold</strong>. This amount automatically rolls over into the next quarter.
                    </span>
                  </div>
                )}

                {hasZeroPaidPending && !hasPendingRollover && (
                  <div className="flex items-center gap-2 p-3 rounded-[10px] bg-[#DFF3F7]/80 border border-[#4FB3C8]/40 text-xs text-[#3A97AB]">
                    <AlertCircle className="w-4 h-4 shrink-0 text-[#3A97AB]" />
                    <span>
                      Royalty of <strong>₹{book.royaltyPending.toLocaleString("en-IN")}</strong> is scheduled for payout in the upcoming quarterly cycle (within 45 days of quarter end).
                    </span>
                  </div>
                )}

                {/* Distribution Platforms */}
                {book.availableOn && book.availableOn.length > 0 && (
                  <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-semibold text-[#8A94A3]">Available on:</span>
                    {book.availableOn.map((plat) => (
                      <span
                        key={plat}
                        className="px-2.5 py-1 rounded-full bg-white border border-[#E6E8EC] text-[#556070] font-medium"
                      >
                        {plat}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
