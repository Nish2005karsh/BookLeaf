"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useToast } from "@/components/ui/Toast";
import { ArrowLeft, UploadCloud, X, FileText, CheckCircle2 } from "lucide-react";

interface BookOption {
  id: string;
  title: string;
  externalId: string;
  status: string;
}

function NewTicketForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialBookId = searchParams.get("bookId") || "";
  const { error: toastError, success: toastSuccess } = useToast();

  const [books, setBooks] = useState<BookOption[]>([]);
  const [selectedBookId, setSelectedBookId] = useState(initialBookId);
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Load books for dropdown
  useEffect(() => {
    fetch("/api/books")
      .then((res) => res.json())
      .then((data) => {
        if (data.books) {
          setBooks(data.books);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const names = Array.from(e.target.files).map((f) => f.name);
      setAttachments((prev) => Array.from(new Set([...prev, ...names])));
    }
  };

  const removeAttachment = (name: string) => {
    setAttachments((prev) => prev.filter((n) => n !== name));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (subject.length < 5) {
      setFormError("Subject must be at least 5 characters");
      return;
    }
    if (description.length < 20) {
      setFormError("Description must be at least 20 characters (currently " + description.length + ")");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          description,
          bookId: selectedBookId || null,
          attachmentNames: attachments,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to submit query");
      }

      toastSuccess(`Query submitted successfully! BL-${data.ticket.number}`);
      router.push(`/author/tickets/${data.ticket.id}`);
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error creating ticket";
      setFormError(msg);
      toastError(msg);
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/author/tickets"
          className="w-9 h-9 rounded-full bg-white border border-[#F3C9D0] flex items-center justify-center text-[#556070] hover:text-[#F2697A] hover:border-[#F2697A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#2E3A4B]">Raise a Support Query</h1>
          <p className="text-xs text-[#8A94A3] mt-0.5">
            Submit your question or concern directly to BookLeaf ops team.
          </p>
        </div>
      </div>

      <Card className="p-6 md:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="p-4 rounded-[10px] bg-[#FDE4E8] border border-[#F3C9D0] text-[#D9435A] text-sm font-medium">
              {formError}
            </div>
          )}

          {/* Book selector */}
          <Select
            label="Which book is this query about?"
            value={selectedBookId}
            onChange={(e) => setSelectedBookId(e.target.value)}
          >
            <option value="">General / Account Level (No specific book)</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.externalId}: {b.title} ({b.status})
              </option>
            ))}
          </Select>

          {/* Subject */}
          <div className="space-y-1">
            <Input
              label="Subject"
              placeholder="e.g. Haven't received Q3 royalty payout"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              minLength={5}
              maxLength={120}
              required
            />
            <div className="flex justify-end text-[11px] text-[#8A94A3]">
              <span>{subject.length} / 120 characters</span>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1">
            <Textarea
              label="Detailed Description"
              rows={6}
              placeholder="Please describe your issue or question in detail. If this is about royalties, printing, or platform listings, mentioning specific dates or copies helps us resolve it faster..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              minLength={20}
              maxLength={4000}
              required
            />
            <div className="flex justify-between items-center text-[11px] text-[#8A94A3]">
              <span className={description.length < 20 ? "text-[#D9435A]" : "text-[#2FA36B]"}>
                Minimum 20 characters
              </span>
              <span>{description.length} / 4000 characters</span>
            </div>
          </div>

          {/* Attachment dropzone (UI only per PRD) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-[#2E3A4B]">
              File Attachments (Optional)
            </label>
            <div className="border-2 border-dashed border-[#F3C9D0] hover:border-[#F2697A] rounded-[14px] p-6 text-center bg-[#FFF5F6]/50 transition-colors">
              <input
                type="file"
                multiple
                id="file-drop"
                className="hidden"
                onChange={handleFileDrop}
              />
              <label
                htmlFor="file-drop"
                className="flex flex-col items-center justify-center cursor-pointer gap-2"
              >
                <div className="w-10 h-10 rounded-full bg-[#FDE4E8] text-[#F2697A] flex items-center justify-center">
                  <UploadCloud className="w-5 h-5" />
                </div>
                <span className="text-sm font-bold text-[#2E3A4B]">
                  Click to select screenshots or documents
                </span>
                <span className="text-xs text-[#8A94A3]">
                  Attachments upload coming soon • File names are attached to the ticket
                </span>
              </label>
            </div>

            {/* Attached file list */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {attachments.map((name) => (
                  <span
                    key={name}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-white border border-[#F3C9D0] text-[#2E3A4B] font-medium shadow-sm"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#4FB3C8]" />
                    <span className="truncate max-w-[150px]">{name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(name)}
                      className="text-[#8A94A3] hover:text-[#D9435A] ml-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#F3C9D0]/50">
            <Link href="/author/tickets">
              <Button variant="outline" type="button" size="md">
                Cancel
              </Button>
            </Link>
            <Button
              variant="primary"
              type="submit"
              size="md"
              loading={submitting}
              className="gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Submit Query</span>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-[#F2697A]">Loading query form...</div>}>
      <NewTicketForm />
    </Suspense>
  );
}
