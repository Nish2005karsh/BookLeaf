"use client";

import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import {
  ArrowLeft,
  Send,
  User,
  ShieldCheck,
  Calendar,
  Lock,
  FileText,
  Clock,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AuthorTicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { success: toastSuccess, error: toastError } = useToast();

  const [replyBody, setReplyBody] = useState("");
  const [sending, setSending] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const prevMessagesCountRef = useRef(0);

  // SWR polling every 4s while tab is visible
  const { data, mutate, isValidating } = useSWR(
    `/api/tickets/${id}`,
    fetcher,
    {
      refreshInterval: 4000,
      revalidateOnFocus: true,
    }
  );

  const ticket = data?.ticket;

  // Track new incoming admin messages for aria-live announcement
  useEffect(() => {
    if (ticket && ticket.messages) {
      if (
        prevMessagesCountRef.current > 0 &&
        ticket.messages.length > prevMessagesCountRef.current
      ) {
        const lastMsg = ticket.messages[ticket.messages.length - 1];
        if (lastMsg.sender === "ADMIN") {
          setAnnouncement("New reply received from BookLeaf Support: " + lastMsg.body.slice(0, 80));
        }
      }
      prevMessagesCountRef.current = ticket.messages.length;
    }
  }, [ticket]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyBody.trim()) return;

    setSending(true);

    try {
      const res = await fetch(`/api/tickets/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: replyBody.trim() }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error?.message || "Failed to send follow-up");
      }

      setReplyBody("");
      toastSuccess("Your message has been sent to the support team.");
      mutate();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error sending message";
      toastError(msg);
    } finally {
      setSending(false);
    }
  };

  if (!ticket) {
    return (
      <div className="max-w-3xl mx-auto py-12 text-center">
        <div className="w-10 h-10 border-4 border-[#F2697A] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-[#8A94A3]">Loading query conversation...</p>
      </div>
    );
  }

  const isClosed = ticket.status === "CLOSED";
  const isResolved = ticket.status === "RESOLVED";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Hidden aria-live announcement region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/author/tickets"
            className="w-9 h-9 rounded-full bg-white border border-[#F3C9D0] flex items-center justify-center text-[#556070] hover:text-[#F2697A] hover:border-[#F2697A] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold bg-[#DFF3F7] text-[#3A97AB] px-2.5 py-0.5 rounded-md">
                BL-{ticket.number}
              </span>
              <StatusBadge status={ticket.status} />
              {isValidating && (
                <span className="text-[10px] text-[#8A94A3] flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4FB3C8] animate-ping" />
                  <span>Checking updates...</span>
                </span>
              )}
            </div>
            <h1 className="text-xl md:text-2xl font-black text-[#2E3A4B] mt-1">
              {ticket.subject}
            </h1>
          </div>
        </div>

        {ticket.book && (
          <div className="text-left sm:text-right text-xs text-[#8A94A3] bg-white sm:bg-transparent p-3 sm:p-0 rounded-lg border sm:border-0 border-[#F3C9D0]/50">
            <span className="block font-bold text-[#2E3A4B]">{ticket.book.title}</span>
            <span>{ticket.book.externalId} • {ticket.book.status}</span>
          </div>
        )}
      </div>

      {/* Conversation Thread */}
      <div className="space-y-4">
        {/* Original Query Card */}
        <Card className="p-6 bg-white border border-[#F3C9D0] shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#F3C9D0]/40 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#FDE4E8] text-[#F2697A] flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-[#2E3A4B]">You (Original Query)</span>
                <span className="block text-[10px] text-[#8A94A3]">
                  {new Date(ticket.createdAt).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>

          <div className="text-sm text-[#2E3A4B] whitespace-pre-wrap leading-relaxed">
            {ticket.description}
          </div>

          {/* Attachments if any */}
          {ticket.attachmentNames && ticket.attachmentNames.length > 0 && (
            <div className="pt-3 border-t border-[#F3C9D0]/30 flex flex-wrap gap-2">
              <span className="text-xs font-bold text-[#8A94A3] flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" />
                <span>Attachments:</span>
              </span>
              {ticket.attachmentNames.map((name: string) => (
                <span
                  key={name}
                  className="px-2.5 py-1 rounded-full text-xs bg-[#FFF5F6] border border-[#F3C9D0] text-[#556070] font-medium"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Message Thread */}
        {ticket.messages && ticket.messages.map((msg: any, idx: number) => {
          const isAdmin = msg.sender === "ADMIN";

          return (
            <div
              key={msg.id}
              className={`flex flex-col ${isAdmin ? "items-start" : "items-end"}`}
            >
              <div
                className={`max-w-[85%] rounded-[14px] p-5 shadow-sm space-y-2.5 ${
                  isAdmin
                    ? "bg-[#DFF3F7] border border-[#4FB3C8]/40 text-[#2E3A4B]"
                    : "bg-white border border-[#F3C9D0] text-[#2E3A4B]"
                }`}
              >
                <div className="flex items-center justify-between gap-4 border-b border-black/5 pb-2">
                  <div className="flex items-center gap-2">
                    {isAdmin ? (
                      <div className="w-6 h-6 rounded-full bg-[#4FB3C8] text-white flex items-center justify-center">
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-[#FDE4E8] text-[#F2697A] flex items-center justify-center">
                        <User className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <span className="text-xs font-bold">
                      {isAdmin ? "Team BookLeaf Support" : "You (Follow-up)"}
                    </span>
                  </div>

                  <span className="text-[10px] text-[#556070]/80">
                    {new Date(msg.createdAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="text-sm whitespace-pre-wrap leading-relaxed">
                  {msg.body}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reply Composer or Notice */}
      {isClosed ? (
        <Card className="p-6 bg-[#F3F4F6] border border-[#E6E8EC] text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-[#E5E7EB] text-[#6B7280] flex items-center justify-center mx-auto">
            <Lock className="w-4 h-4" />
          </div>
          <h4 className="text-sm font-bold text-[#2E3A4B]">This query has been closed</h4>
          <p className="text-xs text-[#8A94A3] max-w-sm mx-auto">
            This inquiry thread has been archived. If you have any further questions or new issues, please raise a new support ticket.
          </p>
          <div className="pt-2">
            <Link href="/author/tickets/new">
              <Button variant="primary" size="sm">
                Raise a New Ticket
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <Card className="p-6 bg-white border border-[#F3C9D0] shadow-sm space-y-4">
          {isResolved && (
            <div className="p-3 rounded-[10px] bg-[#DCFCE7]/70 border border-[#86EFAC] text-xs text-[#15803D] flex items-center gap-2">
              <Clock className="w-4 h-4 shrink-0 text-[#2FA36B]" />
              <span>
                This ticket is currently marked as <strong>Resolved</strong>. Sending a follow-up reply below will automatically reopen it for the ops team.
              </span>
            </div>
          )}

          <form onSubmit={handleSendReply} className="space-y-4">
            <Textarea
              rows={3}
              placeholder="Type your follow-up reply or question here..."
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              required
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#8A94A3]">
                Your response will alert the assigned support specialist.
              </span>
              <Button
                type="submit"
                variant="primary"
                size="md"
                loading={sending}
                disabled={!replyBody.trim()}
                className="gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Send Reply</span>
              </Button>
            </div>
          </form>
        </Card>
      )}
    </div>
  );
}
