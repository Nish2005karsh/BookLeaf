import React from "react";

export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-[10px] bg-[#FDE4E8]/60 ${className}`}
      aria-hidden="true"
    />
  );
}
