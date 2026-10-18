import React from "react";

interface UrgencyBadgeProps {
  score: number;
  showLabel?: boolean;
}

export function UrgencyBadge({ score, showLabel = true }: UrgencyBadgeProps) {
  let badgeClasses = "";
  let dotClasses = "";
  let label = "Low";

  if (score >= 70) {
    badgeClasses = "bg-[#FDE4E8] text-[#D9435A] border-[#F8B4BD]";
    dotClasses = "bg-[#D9435A] animate-pulse";
    label = "Critical";
  } else if (score >= 40) {
    badgeClasses = "bg-amber-50 text-amber-700 border-amber-200";
    dotClasses = "bg-amber-500";
    label = "Medium";
  } else {
    badgeClasses = "bg-[#EBF7F9] text-[#1E7485] border-[#C5EAF0]";
    dotClasses = "bg-[#4FB3C8]";
    label = "Low";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClasses}`}
      title={`Urgency Score: ${score}/100`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotClasses}`} />
      <span>{score}</span>
      {showLabel && <span className="font-normal opacity-75">· {label}</span>}
    </span>
  );
}
