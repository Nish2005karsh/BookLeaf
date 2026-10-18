import React from "react";
import Link from "next/link";

interface LogoProps {
  subtitle?: string;
  href?: string;
  size?: "sm" | "md" | "lg";
}

export function Logo({ subtitle = "Author Support", href = "/", size = "md" }: LogoProps) {
  const isSm = size === "sm";
  const isLg = size === "lg";

  const boxSize = isSm ? "w-7 h-7 text-sm" : isLg ? "w-11 h-11 text-xl" : "w-9 h-9 text-base";
  const titleSize = isSm ? "text-base" : isLg ? "text-2xl" : "text-lg";
  const pubSize = isSm ? "text-[9px]" : isLg ? "text-xs" : "text-[10px]";
  const subSize = isSm ? "text-[10px]" : "text-xs";

  const content = (
    <div className="flex items-center gap-3 select-none">
      <div
        className={`${boxSize} rounded-[8px] bg-[#F2697A] text-white flex items-center justify-center font-black shadow-sm`}
        aria-hidden="true"
      >
        /
      </div>
      <div className="flex flex-col leading-none">
        <div className="flex items-baseline gap-1">
          <span className={`${titleSize} font-light tracking-tight text-[#2E3A4B]`}>
            Book<span className="font-bold text-[#F2697A]">Leaf</span>
          </span>
          <span className={`${pubSize} font-medium tracking-widest uppercase text-[#8A94A3]`}>
            Publishing
          </span>
        </div>
        {subtitle && (
          <span className={`${subSize} font-semibold text-[#4FB3C8] tracking-normal mt-0.5`}>
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex hover:opacity-95 transition-opacity">
        {content}
      </Link>
    );
  }

  return content;
}
