import React from "react";

export interface StatItem {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  hint?: string;
}

export interface StatStripProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  stats: StatItem[];
}

export function StatStrip({ title, subtitle, action, stats }: StatStripProps) {
  return (
    <div className="w-full rounded-[14px] overflow-hidden shadow-[0_4px_24px_rgba(242,105,122,0.12)] mb-8">
      {/* Header Coral Band */}
      <div className="bg-[#F2697A] px-8 py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-white">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-sm md:text-base text-white/90 mt-1 font-normal">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>

      {/* Teal Stat Strip */}
      <div className="bg-[#4FB3C8] px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-white/20">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`flex items-center gap-3.5 pt-3 md:pt-0 ${
              idx !== 0 ? "md:pl-6" : ""
            }`}
          >
            {stat.icon && (
              <div className="w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center shrink-0">
                {stat.icon}
              </div>
            )}
            <div className="flex flex-col">
              <span className="text-2xl font-black text-white leading-none">
                {stat.value}
              </span>
              <span className="text-xs font-semibold text-white/85 tracking-wide mt-1 uppercase">
                {stat.label}
              </span>
              {stat.hint && (
                <span className="text-[10px] text-white/70">{stat.hint}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
