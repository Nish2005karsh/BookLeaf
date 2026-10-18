import React from "react";
import {
  CreditCard,
  Barcode,
  Printer,
  Globe,
  Clock,
  HelpCircle,
  Sparkles,
  UserCheck,
} from "lucide-react";

export type TicketStatusType = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
export type PriorityType = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
export type CategoryType =
  | "ROYALTY_PAYMENTS"
  | "ISBN_METADATA"
  | "PRINTING_QUALITY"
  | "DISTRIBUTION_AVAILABILITY"
  | "BOOK_STATUS_PRODUCTION"
  | "GENERAL_INQUIRY";

interface StatusBadgeProps {
  status: TicketStatusType | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toUpperCase();
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    OPEN: { bg: "bg-[#DFF3F7]", text: "text-[#3A97AB]", label: "Open" },
    IN_PROGRESS: { bg: "bg-[#FEF3C7]", text: "text-[#B45309]", label: "In Progress" },
    RESOLVED: { bg: "bg-[#DCFCE7]", text: "text-[#15803D]", label: "Resolved" },
    CLOSED: { bg: "bg-[#F3F4F6]", text: "text-[#6B7280]", label: "Closed" },
  };

  const current = styles[normalized] || {
    bg: "bg-[#F3F4F6]",
    text: "text-[#6B7280]",
    label: status,
  };

  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide ${current.bg} ${current.text}`}
    >
      {current.label}
    </span>
  );
}

interface PriorityBadgeProps {
  priority: PriorityType | string;
}

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  const normalized = priority.toUpperCase();
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    CRITICAL: { bg: "bg-[#D9435A]", text: "text-white", label: "Critical" },
    HIGH: { bg: "bg-[#F2697A]", text: "text-white", label: "High" },
    MEDIUM: { bg: "bg-[#FEF3C7]", text: "text-[#B45309]", label: "Medium" },
    LOW: { bg: "bg-[#F3F4F6]", text: "text-[#6B7280]", label: "Low" },
  };

  const current = styles[normalized] || {
    bg: "bg-[#F3F4F6]",
    text: "text-[#6B7280]",
    label: priority,
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold tracking-wide ${current.bg} ${current.text}`}
    >
      {current.label}
    </span>
  );
}

interface CategoryBadgeProps {
  category: CategoryType | string;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const normalized = category.toUpperCase();

  const config: Record<string, { label: string; icon: React.ReactNode }> = {
    ROYALTY_PAYMENTS: {
      label: "Royalty & Payments",
      icon: <CreditCard className="w-3 h-3 text-[#F2697A]" />,
    },
    ISBN_METADATA: {
      label: "ISBN & Metadata",
      icon: <Barcode className="w-3 h-3 text-[#3A97AB]" />,
    },
    PRINTING_QUALITY: {
      label: "Printing & Quality",
      icon: <Printer className="w-3 h-3 text-[#B45309]" />,
    },
    DISTRIBUTION_AVAILABILITY: {
      label: "Distribution & Availability",
      icon: <Globe className="w-3 h-3 text-[#4FB3C8]" />,
    },
    BOOK_STATUS_PRODUCTION: {
      label: "Production Status",
      icon: <Clock className="w-3 h-3 text-[#F2697A]" />,
    },
    GENERAL_INQUIRY: {
      label: "General Inquiry",
      icon: <HelpCircle className="w-3 h-3 text-[#6B7280]" />,
    },
  };

  const current = config[normalized] || {
    label: category,
    icon: <HelpCircle className="w-3 h-3 text-[#6B7280]" />,
  };

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold text-[#556070] bg-white border border-[#E6E8EC]">
      {current.icon}
      <span>{current.label}</span>
    </span>
  );
}

interface AiChipProps {
  confidence?: number | null;
  overriddenBy?: string | null;
  ruleBased?: boolean;
}

export function AiChip({ confidence, overriddenBy, ruleBased }: AiChipProps) {
  if (overriddenBy) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F3F4F6] text-[#556070] border border-[#E6E8EC]">
        <UserCheck className="w-2.5 h-2.5 text-[#3A97AB]" />
        <span>Edited by {overriddenBy}</span>
      </span>
    );
  }

  if (ruleBased) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]">
        <span>Rule-based suggestion</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#FDE4E8] text-[#F2697A] border border-[#F3C9D0]">
      <Sparkles className="w-2.5 h-2.5 text-[#F2697A]" />
      <span>
        AI suggested{confidence ? ` (${Math.round(confidence * 100)}%)` : ""}
      </span>
    </span>
  );
}
