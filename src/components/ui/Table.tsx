import React from "react";

export function Table({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-[14px] border border-[#F3C9D0] bg-white shadow-sm">
      <table className={`w-full text-left border-collapse ${className}`}>{children}</table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-[#FFF5F6] border-b border-[#F3C9D0] sticky top-0 z-10">
      {children}
    </thead>
  );
}

export function TableHead({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`py-3.5 px-4 text-xs font-bold uppercase tracking-wider text-[#E04F62] whitespace-nowrap ${className}`}
    >
      {children}
    </th>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-[#F3C9D0]/40">{children}</tbody>;
}

export function TableRow({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <tr
      onClick={onClick}
      className={`transition-colors hover:bg-[#FFF5F6] ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableCell({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`py-4 px-4 text-sm text-[#2E3A4B] align-middle ${className}`}>
      {children}
    </td>
  );
}
