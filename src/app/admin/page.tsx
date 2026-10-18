"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { StatStrip } from "@/components/ui/StatStrip";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { UrgencyBadge } from "@/components/admin/UrgencyBadge";
import {
  Inbox,
  AlertTriangle,
  Clock,
  UserCheck,
  RefreshCw,
  Search,
  ArrowRight,
  Bot,
} from "lucide-react";

interface TicketSummary {
  id: string;
  number: string;
  subject: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: string;
  aiCategory?: string;
  aiPriority?: string;
  aiConfidence?: number;
  aiReason?: string;
  urgencyScore?: number;
  assignedTo?: { id: string; name: string } | null;
  author: { id: string; name: string; email: string };
  book?: { id: string; title: string; externalId: string; status: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminStats {
  openTickets: number;
  inProgressTickets: number;
  criticalHighTickets: number;
  unassignedTickets: number;
  aiCallsToday: number;
}

const CATEGORY_LABELS: Record<string, string> = {
  ROYALTY_PAYMENTS: "Royalty & Payments",
  PRINTING_QUALITY: "Printing & Quality",
  DISTRIBUTION_AVAILABILITY: "Distribution",
  ISBN_METADATA: "ISBN & Metadata",
  BOOK_STATUS_PRODUCTION: "Production Status",
  GENERAL_INQUIRY: "General Inquiry",
};

export default function AdminQueuePage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("OPEN_ACTIVE");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [assignedFilter, setAssignedFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("urgency");

  // Fetch Tickets
  const fetchTickets = useCallback(async (isSilent = false) => {
    if (!isSilent) setRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "ALL" && statusFilter !== "OPEN_ACTIVE") {
        params.set("status", statusFilter);
      }
      if (priorityFilter !== "ALL") params.set("priority", priorityFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);
      params.set("sort", sortBy);

      const res = await fetch(`/api/tickets?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load tickets");
      const json = await res.json();
      setTickets(json.data?.tickets || []);
    } catch (err: any) {
      if (!isSilent) toastError(err.message || "Failed to load tickets");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, priorityFilter, categoryFilter, sortBy, toastError]);

  // Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
      }
    } catch {
      // ignore silent stats fail
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTickets();
    fetchStats();
  }, [fetchTickets, fetchStats]);

  // Short polling every 10s while tab is active
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchTickets(true);
        fetchStats();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchTickets, fetchStats]);

  // Quick Assign to Me
  const handleAssignToMe = async (ticketId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAssigningId(ticketId);
    try {
      const res = await fetch(`/api/tickets/${ticketId}/assign-me`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to assign ticket");
      success("Ticket assigned to you");
      fetchTickets(true);
      fetchStats();
    } catch (err: any) {
      toastError(err.message || "Could not assign ticket");
    } finally {
      setAssigningId(null);
    }
  };

  // Filter in-memory for search & complex status combinations
  const filteredTickets = tickets.filter((ticket) => {
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchNumber = ticket.number.toLowerCase().includes(q);
      const matchSubject = ticket.subject.toLowerCase().includes(q);
      const matchAuthor = ticket.author.name.toLowerCase().includes(q);
      const matchBook = ticket.book?.title.toLowerCase().includes(q) || false;
      if (!matchNumber && !matchSubject && !matchAuthor && !matchBook) return false;
    }

    // Status: OPEN_ACTIVE means OPEN or IN_PROGRESS
    if (statusFilter === "OPEN_ACTIVE") {
      if (ticket.status !== "OPEN" && ticket.status !== "IN_PROGRESS") return false;
    }

    // Assigned filter
    if (assignedFilter === "UNASSIGNED" && ticket.assignedTo) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner & Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#2E3A4B] tracking-tight">
            Author Support Queue
          </h1>
          <p className="text-sm text-[#556070] mt-1">
            Prioritized by intelligent urgency scoring and real-time SLA metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#E8ECF2] shadow-xs text-xs text-[#556070]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Live Short-Polling (10s)</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              fetchTickets();
              fetchStats();
            }}
            disabled={refreshing}
            className="!h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Stats Strip */}
      <StatStrip
        title="Workbench Overview"
        subtitle="Live ticket metrics and AI assistance activity"
        stats={[
          {
            label: "Open & Active",
            value: stats ? stats.openTickets + stats.inProgressTickets : tickets.filter(t => t.status === "OPEN" || t.status === "IN_PROGRESS").length,
            icon: <Clock className="w-5 h-5" />,
          },
          {
            label: "Critical / High",
            value: stats ? stats.criticalHighTickets : tickets.filter(t => t.priority === "CRITICAL" || t.priority === "HIGH").length,
            icon: <AlertTriangle className="w-5 h-5" />,
          },
          {
            label: "Unassigned",
            value: stats ? stats.unassignedTickets : tickets.filter(t => !t.assignedTo).length,
            icon: <UserCheck className="w-5 h-5" />,
          },
          {
            label: "AI Operations",
            value: stats ? stats.aiCallsToday : "-",
            icon: <Bot className="w-5 h-5" />,
          },
        ]}
      />

      {/* Filter and Control Bar */}
      <Card className="p-4 sm:p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Search */}
          <div className="lg:col-span-2 relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-[#8A94A3] z-10" />
            <Input
              placeholder="Search #BLT, author, book, subject..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Status Filter */}
          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { label: "Active (Open & In Progress)", value: "OPEN_ACTIVE" },
                { label: "All Statuses", value: "ALL" },
                { label: "Open Only", value: "OPEN" },
                { label: "In Progress", value: "IN_PROGRESS" },
                { label: "Resolved Only", value: "RESOLVED" },
                { label: "Closed Only", value: "CLOSED" },
              ]}
            />
          </div>

          {/* Priority Filter */}
          <div>
            <Select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              options={[
                { label: "All Priorities", value: "ALL" },
                { label: "Critical", value: "CRITICAL" },
                { label: "High", value: "HIGH" },
                { label: "Medium", value: "MEDIUM" },
                { label: "Low", value: "LOW" },
              ]}
            />
          </div>

          {/* Category Filter */}
          <div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { label: "All Categories", value: "ALL" },
                { label: "Royalty & Payments", value: "ROYALTY_PAYMENTS" },
                { label: "Printing & Quality", value: "PRINTING_QUALITY" },
                { label: "Distribution", value: "DISTRIBUTION_AVAILABILITY" },
                { label: "ISBN & Metadata", value: "ISBN_METADATA" },
                { label: "Production Pipeline", value: "BOOK_STATUS_PRODUCTION" },
                { label: "General Inquiry", value: "GENERAL_INQUIRY" },
              ]}
            />
          </div>

          {/* Sort Selector */}
          <div>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              options={[
                { label: "Sort: Urgency Score", value: "urgency" },
                { label: "Sort: Oldest First", value: "oldest" },
                { label: "Sort: Newest First", value: "newest" },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Ticket List / Queue Table */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : filteredTickets.length === 0 ? (
        <Card className="p-12 text-center">
          <EmptyState
            icon={<Inbox className="w-12 h-12 text-[#4FB3C8]" />}
            title="No tickets found"
            description={
              search.trim() || statusFilter !== "OPEN_ACTIVE"
                ? "No support tickets match your active filter criteria."
                : "The queue is clean! No tickets are currently pending attention."
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredTickets.map((ticket) => {
            const urgency = ticket.urgencyScore ?? 50;
            const isCritical = ticket.priority === "CRITICAL";

            return (
              <div
                key={ticket.id}
                onClick={() => router.push(`/admin/tickets/${ticket.id}`)}
                className={`group bg-white rounded-xl border transition-all duration-200 p-4 sm:p-5 cursor-pointer shadow-xs hover:shadow-md ${
                  isCritical
                    ? "border-[#F8B4BD] bg-[#FFF5F6]/40 hover:border-[#F2697A]"
                    : "border-[#E8ECF2] hover:border-[#4FB3C8]"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left Column: Urgency + Identifiers */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="pt-0.5">
                      <UrgencyBadge score={urgency} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold text-[#556070] bg-[#F8F9FA] px-2 py-0.5 rounded border border-[#E8ECF2]">
                          {ticket.number}
                        </span>

                        <Badge
                          variant={
                            ticket.priority === "CRITICAL"
                              ? "coral"
                              : ticket.priority === "HIGH"
                              ? "amber"
                              : ticket.priority === "MEDIUM"
                              ? "teal"
                              : "neutral"
                          }
                          size="sm"
                        >
                          {ticket.priority}
                        </Badge>

                        <span className="text-xs text-[#8A94A3]">
                          {CATEGORY_LABELS[ticket.category] || ticket.category}
                        </span>

                        {ticket.aiReason && (
                          <span
                            className="hidden md:inline-flex items-center gap-1 text-[11px] text-[#4FB3C8] bg-[#EBF7F9] px-2 py-0.5 rounded-full"
                            title={ticket.aiReason}
                          >
                            <Bot className="w-3 h-3" />
                            <span className="truncate max-w-[200px]">{ticket.aiReason}</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-[#2E3A4B] group-hover:text-[#F2697A] transition-colors truncate">
                        {ticket.subject}
                      </h3>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#8A94A3] mt-2">
                        <span>
                          Author: <strong className="text-[#556070]">{ticket.author.name}</strong>
                        </span>

                        {ticket.book && (
                          <span>
                            Book: <strong className="text-[#556070]">{ticket.book.title}</strong>
                            {ticket.book.status === "IN_PRODUCTION" && (
                              <span className="ml-1 text-[#4FB3C8] font-medium">(In Production)</span>
                            )}
                          </span>
                        )}

                        <span>
                          Created: {new Date(ticket.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Status, Assignment, Action */}
                  <div className="flex items-center justify-between lg:justify-end gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E8ECF2]">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          ticket.status === "OPEN"
                            ? "coral"
                            : ticket.status === "IN_PROGRESS"
                            ? "teal"
                            : ticket.status === "RESOLVED"
                            ? "success"
                            : "neutral"
                        }
                      >
                        {ticket.status.replace("_", " ")}
                      </Badge>

                      {ticket.assignedTo ? (
                        <span className="text-xs text-[#556070] bg-[#F8F9FA] px-2.5 py-1 rounded-full border border-[#E8ECF2]">
                          👤 {ticket.assignedTo.name}
                        </span>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={assigningId === ticket.id}
                          onClick={(e) => handleAssignToMe(ticket.id, e)}
                          className="!h-7 !text-xs !px-2.5"
                        >
                          <UserCheck className="w-3.5 h-3.5 mr-1" />
                          <span>Assign to Me</span>
                        </Button>
                      )}
                    </div>

                    <ArrowRight className="w-4 h-4 text-[#8A94A3] group-hover:text-[#F2697A] group-hover:translate-x-0.5 transition-all hidden sm:block" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
