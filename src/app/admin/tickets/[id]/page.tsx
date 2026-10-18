"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { UrgencyBadge } from "@/components/admin/UrgencyBadge";
import {
  ArrowLeft,
  Bot,
  Lock,
  Send,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  UserCheck,
  Sparkles,
  Paperclip,
  BookOpen,
} from "lucide-react";

interface TicketDetail {
  id: string;
  number: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  category: string;
  aiCategory?: string;
  aiPriority?: string;
  aiConfidence?: number;
  aiReason?: string;
  aiState?: string;
  urgencyScore?: number;
  categoryOverriddenById?: string | null;
  priorityOverriddenById?: string | null;
  assignedTo?: { id: string; name: string; email: string } | null;
  author: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    city?: string | null;
  };
  book?: {
    id: string;
    title: string;
    externalId: string;
    status: string;
    isbn?: string | null;
    mrp?: number | null;
    copiesSold: number;
    royaltyEarned: number;
    royaltyPaid: number;
    royaltyPending: number;
    printPartner?: string | null;
    availableOn?: string[];
  } | null;
  attachmentNames?: string[];
  messages: Array<{
    id: string;
    sender: "AUTHOR" | "ADMIN";
    body: string;
    createdAt: string;
    authorUser?: { name: string; role: string };
  }>;
  internalNotes: Array<{
    id: string;
    body: string;
    createdAt: string;
    admin: { name: string };
  }>;
  draftResponse?: string | null;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_OPTIONS = [
  { label: "Royalty & Payments", value: "ROYALTY_PAYMENTS" },
  { label: "Printing & Quality", value: "PRINTING_QUALITY" },
  { label: "Distribution & Availability", value: "DISTRIBUTION_AVAILABILITY" },
  { label: "ISBN & Metadata", value: "ISBN_METADATA" },
  { label: "Production Pipeline", value: "BOOK_STATUS_PRODUCTION" },
  { label: "General Inquiry", value: "GENERAL_INQUIRY" },
];

const PRIORITY_OPTIONS = [
  { label: "Critical", value: "CRITICAL" },
  { label: "High", value: "HIGH" },
  { label: "Medium", value: "MEDIUM" },
  { label: "Low", value: "LOW" },
];

const STATUS_OPTIONS = [
  { label: "Open", value: "OPEN" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Resolved", value: "RESOLVED" },
  { label: "Closed", value: "CLOSED" },
];

export default function AdminTicketWorkbenchPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { success, error: toastError, info } = useToast();

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // AI draft state
  const [draft, setDraft] = useState("");
  const [draftSource, setDraftSource] = useState<"ai" | "template">("template");
  const [draftLoading, setDraftLoading] = useState(false);

  // Response composer
  const [replyText, setReplyText] = useState("");
  const [replyStatus, setReplyStatus] = useState<"IN_PROGRESS" | "RESOLVED">("IN_PROGRESS");
  const [sendingReply, setSendingReply] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);

  // Internal note composer
  const [noteText, setNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  // Triage override form
  const [overrideCategory, setOverrideCategory] = useState("");
  const [overridePriority, setOverridePriority] = useState("");
  const [overrideStatus, setOverrideStatus] = useState("");
  const [savingTriage, setSavingTriage] = useState(false);
  const [reclassifying, setReclassifying] = useState(false);

  // Load ticket
  const fetchTicket = useCallback(async (isSilent = false) => {
    try {
      const res = await fetch(`/api/tickets/${id}`);
      if (!res.ok) throw new Error("Failed to load ticket");
      const json = await res.json();
      const data: TicketDetail = json.data?.ticket;
      setTicket(data);

      if (!isSilent) {
        setOverrideCategory(data.category);
        setOverridePriority(data.priority);
        setOverrideStatus(data.status);
      }
    } catch (err: any) {
      if (!isSilent) toastError(err.message || "Failed to load ticket");
    } finally {
      setLoading(false);
    }
  }, [id, toastError]);

  // Load or generate draft
  const loadDraft = useCallback(async (force = false) => {
    setDraftLoading(true);
    try {
      const res = await fetch(`/api/tickets/${id}/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force }),
      });
      if (!res.ok) throw new Error("Failed to generate draft");
      const json = await res.json();
      setDraft(json.data.draft);
      setDraftSource(json.data.source);
      // Pre-fill composer if empty or if forced regenerate
      setReplyText((prev) => (!prev.trim() || force ? json.data.draft : prev));
      if (force) {
        success("Draft regenerated successfully");
      }
    } catch (err: any) {
      toastError(err.message || "Failed to generate draft");
    } finally {
      setDraftLoading(false);
    }
  }, [id, success, toastError]);

  useEffect(() => {
    fetchTicket();
    loadDraft(false);
  }, [fetchTicket, loadDraft]);

  // Short polling every 4s for active thread updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        fetchTicket(true);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [fetchTicket]);

  // Detect [[VERIFY: ...]] markers
  const verifyMarkers = (replyText.match(/\[\[VERIFY:.*?\]\]/g) || []);

  // Save Triage & Overrides
  const handleSaveTriage = async () => {
    setSavingTriage(true);
    try {
      const res = await fetch(`/api/tickets/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: overrideCategory,
          priority: overridePriority,
          status: overrideStatus,
        }),
      });
      if (!res.ok) throw new Error("Failed to update triage");
      success("Triage settings saved");
      fetchTicket(true);
    } catch (err: any) {
      toastError(err.message || "Failed to save triage");
    } finally {
      setSavingTriage(false);
    }
  };

  // Re-run AI Triage
  const handleReclassify = async () => {
    setReclassifying(true);
    try {
      const res = await fetch(`/api/tickets/${id}/classify`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to re-triage");
      success("Ticket re-classified by AI");
      fetchTicket(true);
    } catch (err: any) {
      toastError(err.message || "Could not re-classify");
    } finally {
      setReclassifying(false);
    }
  };

  // Assign to Me
  const handleAssignToMe = async () => {
    try {
      const res = await fetch(`/api/tickets/${id}/assign-me`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to assign ticket");
      success("Assigned to you");
      fetchTicket(true);
    } catch (err: any) {
      toastError(err.message || "Could not assign ticket");
    }
  };

  // Add Internal Note
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setAddingNote(true);
    try {
      const res = await fetch(`/api/tickets/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteText.trim() }),
      });
      if (!res.ok) throw new Error("Failed to add internal note");
      setNoteText("");
      success("Internal note added");
      fetchTicket(true);
    } catch (err: any) {
      toastError(err.message || "Could not add internal note");
    } finally {
      setAddingNote(false);
    }
  };

  // Send Reply Handler
  const handleSendReplyClick = () => {
    if (!replyText.trim()) {
      toastError("Please enter a reply before sending");
      return;
    }

    if (verifyMarkers.length > 0) {
      setShowVerifyModal(true);
      return;
    }

    executeSendReply();
  };

  const executeSendReply = async () => {
    setShowVerifyModal(false);
    setSendingReply(true);
    try {
      // 1. Post message
      const resMsg = await fetch(`/api/tickets/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyText.trim() }),
      });
      if (!resMsg.ok) throw new Error("Failed to post message");

      // 2. Update status if resolving
      if (replyStatus === "RESOLVED") {
        await fetch(`/api/tickets/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "RESOLVED" }),
        });
      }

      success(replyStatus === "RESOLVED" ? "Reply sent & ticket resolved" : "Reply sent");
      setReplyText("");
      fetchTicket(true);
    } catch (err: any) {
      toastError(err.message || "Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  if (loading || !ticket) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-96 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  const urgency = ticket.urgencyScore ?? 50;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-[#E8ECF2]">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="flex items-center gap-1.5 text-xs font-bold text-[#556070] hover:text-[#2E3A4B] transition-colors px-2.5 py-1 rounded-lg hover:bg-white border border-transparent hover:border-[#E8ECF2]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Queue</span>
          </Link>

          <span className="font-mono text-sm font-bold text-[#2E3A4B] bg-white px-2.5 py-0.5 rounded border border-[#E8ECF2]">
            {ticket.number}
          </span>

          <UrgencyBadge score={urgency} />
        </div>

        <div className="flex items-center gap-2">
          {ticket.assignedTo ? (
            <span className="text-xs text-[#556070] bg-white px-3 py-1.5 rounded-full border border-[#E8ECF2] shadow-xs">
              Assigned to: <strong>{ticket.assignedTo.name}</strong>
            </span>
          ) : (
            <Button variant="outline" size="sm" onClick={handleAssignToMe} className="!h-8">
              <UserCheck className="w-3.5 h-3.5 mr-1" />
              <span>Assign to Me</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTicket()}
            className="!h-8 !px-2.5"
            title="Refresh ticket"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column (2 Cols): Ticket Header, Context Card, Thread & Response */}
        <div className="lg:col-span-2 space-y-6">
          {/* Ticket Header Card */}
          <Card className="p-6">
            <div className="flex flex-wrap items-center gap-2 mb-2">
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
              >
                {ticket.priority}
              </Badge>

              <span className="text-xs text-[#8A94A3]">
                Created on {new Date(ticket.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-[#2E3A4B] tracking-tight">
              {ticket.subject}
            </h1>

            {/* Author info pill */}
            <div className="flex flex-wrap items-center gap-4 text-xs text-[#556070] mt-3 pt-3 border-t border-[#E8ECF2]">
              <span>
                Author: <strong className="text-[#2E3A4B]">{ticket.author.name}</strong>
              </span>
              <span>Email: {ticket.author.email}</span>
              {ticket.author.phone && <span>Phone: {ticket.author.phone}</span>}
              {ticket.author.city && <span>City: {ticket.author.city}</span>}
            </div>
          </Card>

          {/* Book Context Card (Crucial for facts alignment) */}
          {ticket.book ? (
            <Card className="p-5 bg-[#FAFCFD] border-[#C5EAF0]">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-[#4FB3C8]" />
                <h3 className="text-sm font-bold text-[#1E7485]">Attached Book Context</h3>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <span className="text-[#8A94A3] block">Title</span>
                  <span className="font-bold text-[#2E3A4B]">{ticket.book.title}</span>
                </div>
                <div>
                  <span className="text-[#8A94A3] block">Status</span>
                  <span className="font-bold text-[#2E3A4B]">{ticket.book.status}</span>
                </div>
                <div>
                  <span className="text-[#8A94A3] block">ISBN</span>
                  <span className="font-bold font-mono text-[#2E3A4B]">
                    {ticket.book.isbn || "Pending assignment"}
                  </span>
                </div>
                <div>
                  <span className="text-[#8A94A3] block">MRP</span>
                  <span className="font-bold text-[#2E3A4B]">
                    {ticket.book.mrp ? `₹${ticket.book.mrp}` : "Not set"}
                  </span>
                </div>
                <div>
                  <span className="text-[#8A94A3] block">Copies Sold</span>
                  <span className="font-bold text-[#2E3A4B]">{ticket.book.copiesSold}</span>
                </div>
                <div>
                  <span className="text-[#8A94A3] block">Total Royalty</span>
                  <span className="font-bold text-[#2E3A4B]">₹{ticket.book.royaltyEarned}</span>
                </div>
                <div>
                  <span className="text-[#8A94A3] block">Royalty Paid</span>
                  <span className="font-bold text-[#2E3A4B]">₹{ticket.book.royaltyPaid}</span>
                </div>
                <div>
                  <span className="text-[#8A94A3] block">Royalty Pending</span>
                  <span
                    className={`font-bold ${
                      ticket.book.royaltyPending > 0 ? "text-[#D9435A]" : "text-[#2E3A4B]"
                    }`}
                  >
                    ₹{ticket.book.royaltyPending}
                  </span>
                </div>
              </div>

              {ticket.book.royaltyPending > 0 && ticket.book.royaltyPending < 1000 && (
                <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-[11px]">
                  ℹ️ Pending royalty (₹{ticket.book.royaltyPending}) is below the ₹1,000 threshold and will roll over to the next quarterly disbursement cycle.
                </div>
              )}
            </Card>
          ) : (
            <Card className="p-4 bg-[#F8F9FA] text-xs text-[#8A94A3]">
              No book was directly attached to this query (General Account Level ticket).
            </Card>
          )}

          {/* Conversation Thread */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#556070] uppercase tracking-wider">
              Conversation Thread
            </h3>

            {/* Initial description from author */}
            <div className="bg-white rounded-xl border border-[#E8ECF2] p-5 shadow-xs">
              <div className="flex items-center justify-between text-xs text-[#8A94A3] mb-3">
                <span className="font-bold text-[#2E3A4B]">{ticket.author.name} (Author)</span>
                <span>{new Date(ticket.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p className="text-sm text-[#2E3A4B] whitespace-pre-wrap leading-relaxed">
                {ticket.description}
              </p>

              {ticket.attachmentNames && ticket.attachmentNames.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#E8ECF2] flex flex-wrap gap-2">
                  {ticket.attachmentNames.map((name, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F8F9FA] border border-[#E8ECF2] text-xs text-[#556070]"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-[#8A94A3]" />
                      <span>{name}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Messages */}
            {ticket.messages.map((m) => {
              const isAdmin = m.sender === "ADMIN";
              return (
                <div
                  key={m.id}
                  className={`rounded-xl border p-5 shadow-xs ${
                    isAdmin
                      ? "bg-[#EBF7F9]/50 border-[#C5EAF0] ml-6 sm:ml-10"
                      : "bg-white border-[#E8ECF2] mr-6 sm:mr-10"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-[#8A94A3] mb-2">
                    <span className="font-bold text-[#2E3A4B]">
                      {isAdmin ? `🛡️ ${m.authorUser?.name || "BookLeaf Support"}` : ticket.author.name}
                    </span>
                    <span>
                      {new Date(m.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-[#2E3A4B] whitespace-pre-wrap leading-relaxed">
                    {m.body}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Reply Composer with AI Draft & Send Guard */}
          <Card className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E8ECF2]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F2697A]" />
                <h3 className="text-sm font-bold text-[#2E3A4B]">Author Reply Composer</h3>

                {draftSource === "ai" ? (
                  <Badge variant="teal" size="sm">
                    ✨ AI Draft
                  </Badge>
                ) : (
                  <Badge variant="amber" size="sm">
                    📋 Template Draft (AI offline/mock)
                  </Badge>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => loadDraft(true)}
                disabled={draftLoading}
                className="!h-8 !text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${draftLoading ? "animate-spin" : ""}`} />
                <span>Regenerate Draft</span>
              </Button>
            </div>

            {/* [[VERIFY: ...]] Guard Warning Banner */}
            {verifyMarkers.length > 0 && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <span>
                    Action Required: {verifyMarkers.length} verification marker(s) detected in draft!
                  </span>
                </div>
                <p className="text-amber-700">
                  The draft contains facts that require manual verification before sending to the author:
                </p>
                <ul className="list-disc list-inside space-y-0.5 font-mono text-[11px]">
                  {verifyMarkers.map((marker, i) => (
                    <li key={i}>{marker}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Textarea */}
            <div>
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={8}
                placeholder="Write your reply to the author..."
                className="w-full rounded-xl border border-[#E8ECF2] p-4 text-sm text-[#2E3A4B] focus:border-[#4FB3C8] focus:ring-2 focus:ring-[#C5EAF0] focus:outline-hidden transition-all resize-y leading-relaxed"
              />
            </div>

            {/* Composer Footer Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-[#8A94A3]">On Send:</span>
                <select
                  value={replyStatus}
                  onChange={(e) => setReplyStatus(e.target.value as any)}
                  className="rounded-lg border border-[#E8ECF2] bg-white px-2.5 py-1 text-xs text-[#556070] font-medium"
                >
                  <option value="IN_PROGRESS">Keep In Progress</option>
                  <option value="RESOLVED">Mark as Resolved</option>
                </select>
              </div>

              <Button
                variant="primary"
                onClick={handleSendReplyClick}
                disabled={sendingReply || !replyText.trim()}
                className="!h-10"
              >
                <Send className="w-4 h-4 mr-1.5" />
                <span>{sendingReply ? "Sending..." : "Send Reply"}</span>
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column (1 Col): Triage Panel & Internal Notes */}
        <div className="space-y-6">
          {/* AI Triage & Override Panel */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8ECF2]">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#4FB3C8]" />
                <h3 className="text-sm font-bold text-[#2E3A4B]">Triage & Classification</h3>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleReclassify}
                disabled={reclassifying}
                className="!h-7 !text-xs !px-2"
                title="Re-run AI classification on this ticket"
              >
                <RefreshCw className={`w-3 h-3 ${reclassifying ? "animate-spin" : ""}`} />
              </Button>
            </div>

            {/* AI Diagnostics */}
            <div className="p-3 rounded-lg bg-[#F8F9FA] border border-[#E8ECF2] text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[#8A94A3]">AI Confidence:</span>
                <span className="font-bold text-[#2E3A4B]">
                  {ticket.aiConfidence ? `${Math.round(ticket.aiConfidence * 100)}%` : "N/A"}
                </span>
              </div>
              <div>
                <span className="text-[#8A94A3] block">Triage Rationale:</span>
                <p className="text-[#556070] italic mt-0.5">
                  "{ticket.aiReason || "Awaiting triage processing"}"
                </p>
              </div>
            </div>

            {/* Override Controls */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs font-bold text-[#556070] mb-1 block">
                  Category {ticket.categoryOverriddenById && <span className="text-amber-600 font-normal">(Admin Overridden)</span>}
                </label>
                <Select
                  value={overrideCategory}
                  onChange={(e) => setOverrideCategory(e.target.value)}
                  options={CATEGORY_OPTIONS}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#556070] mb-1 block">
                  Priority {ticket.priorityOverriddenById && <span className="text-amber-600 font-normal">(Admin Overridden)</span>}
                </label>
                <Select
                  value={overridePriority}
                  onChange={(e) => setOverridePriority(e.target.value)}
                  options={PRIORITY_OPTIONS}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-[#556070] mb-1 block">
                  Ticket Status
                </label>
                <Select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  options={STATUS_OPTIONS}
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveTriage}
                disabled={savingTriage}
                className="w-full mt-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                <span>{savingTriage ? "Saving..." : "Save Triage Changes"}</span>
              </Button>
            </div>
          </Card>

          {/* Internal Notes Panel */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-[#E8ECF2]">
              <Lock className="w-4 h-4 text-[#8A94A3]" />
              <h3 className="text-sm font-bold text-[#2E3A4B]">Private Internal Notes</h3>
            </div>

            <div className="p-2.5 rounded-lg bg-[#FFF5F6] border border-[#F3C9D0] text-[11px] text-[#D9435A]">
              🔒 Notes are strictly internal and NEVER visible to the author.
            </div>

            {/* Notes List */}
            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {ticket.internalNotes.length === 0 ? (
                <p className="text-xs text-[#8A94A3] text-center py-4">No internal notes yet.</p>
              ) : (
                ticket.internalNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-lg bg-[#F8F9FA] border border-[#E8ECF2] text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#8A94A3]">
                      <span className="font-bold text-[#2E3A4B]">{note.admin.name}</span>
                      <span>
                        {new Date(note.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-[#556070] whitespace-pre-wrap">{note.body}</p>
                  </div>
                ))
              )}
            </div>

            {/* Note Composer */}
            <form onSubmit={handleAddNote} className="space-y-2 pt-2 border-t border-[#E8ECF2]">
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                rows={3}
                placeholder="Add confidential internal note..."
                className="w-full rounded-lg border border-[#E8ECF2] p-2.5 text-xs text-[#2E3A4B] focus:border-[#4FB3C8] focus:ring-1 focus:ring-[#C5EAF0] focus:outline-hidden"
              />
              <Button
                variant="outline"
                size="sm"
                type="submit"
                disabled={addingNote || !noteText.trim()}
                className="w-full !h-8 !text-xs"
              >
                <span>{addingNote ? "Adding Note..." : "Add Private Note"}</span>
              </Button>
            </form>
          </Card>
        </div>
      </div>

      {/* [[VERIFY: ...]] Confirmation Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-amber-200 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0 text-amber-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#2E3A4B]">Unverified Items in Draft</h3>
                <p className="text-xs text-[#8A94A3]">
                  This draft still has items marked for verification:
                </p>
              </div>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs font-mono text-amber-900 max-h-32 overflow-y-auto space-y-1">
              {verifyMarkers.map((marker, idx) => (
                <div key={idx}>• {marker}</div>
              ))}
            </div>

            <p className="text-xs text-[#556070] leading-relaxed">
              Are you sure you want to send this reply to the author without replacing or verifying these placeholders?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVerifyModal(false)}
              >
                Review Draft
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={executeSendReply}
                className="!bg-amber-600 hover:!bg-amber-700"
              >
                Send Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
