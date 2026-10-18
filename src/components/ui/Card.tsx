import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  interactive?: boolean;
}

export function Card({
  children,
  interactive = false,
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-white border border-[#F3C9D0] rounded-[14px] p-6 shadow-[0_4px_24px_rgba(242,105,122,0.10)] ${
        interactive
          ? "hover:border-[#F2697A] hover:shadow-[0_8px_30px_rgba(242,105,122,0.16)] transition-all cursor-pointer"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  icon,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="w-10 h-10 rounded-full bg-[#FDE4E8] text-[#F2697A] flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-lg font-bold text-[#2E3A4B] leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-[#8A94A3] mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
