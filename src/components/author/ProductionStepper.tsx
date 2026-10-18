import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

export const PRODUCTION_STAGES = [
  "Manuscript Received",
  "Editing",
  "Cover Design",
  "Typesetting",
  "Proofreading",
  "ISBN Assignment",
  "Printing",
  "Distribution Setup",
  "Published & Live",
];

export function getActiveStageIndex(statusString: string): number {
  const lower = statusString.toLowerCase();
  if (lower.includes("manuscript")) return 0;
  if (lower.includes("editing")) return 1;
  if (lower.includes("cover")) return 2;
  if (lower.includes("typesetting")) return 3;
  if (lower.includes("proofreading")) return 4;
  if (lower.includes("isbn")) return 5;
  if (lower.includes("printing")) return 6;
  if (lower.includes("distribution")) return 7;
  if (lower.includes("live") || lower.includes("published")) return 8;
  return 2; // Default to cover design for in-production
}

export function ProductionStepper({ currentStatus }: { currentStatus: string }) {
  const activeIndex = getActiveStageIndex(currentStatus);

  return (
    <div className="w-full py-4 overflow-x-auto">
      <div className="flex items-center min-w-[700px] justify-between relative">
        {/* Connecting background bar */}
        <div className="absolute top-3.5 left-4 right-4 h-0.5 bg-[#E6E8EC] -z-0" />
        <div
          className="absolute top-3.5 left-4 h-0.5 bg-[#F2697A] -z-0 transition-all duration-500"
          style={{ width: `${(activeIndex / (PRODUCTION_STAGES.length - 1)) * 100}%` }}
        />

        {PRODUCTION_STAGES.map((stage, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div key={stage} className="flex flex-col items-center relative z-10 px-1 text-center">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  isCompleted
                    ? "bg-[#2FA36B] text-white"
                    : isCurrent
                    ? "bg-[#F2697A] text-white ring-4 ring-[#FDE4E8]"
                    : "bg-white border-2 border-[#E6E8EC] text-[#8A94A3]"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Circle className="w-2.5 h-2.5 fill-current" />
                )}
              </div>
              <span
                className={`text-[10px] mt-2 font-bold max-w-[75px] leading-tight ${
                  isCurrent
                    ? "text-[#F2697A]"
                    : isCompleted
                    ? "text-[#2FA36B]"
                    : "text-[#8A94A3]"
                }`}
              >
                {stage}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
