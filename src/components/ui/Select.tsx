import React, { forwardRef } from "react";
import { ChevronDown } from "lucide-react";

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
  options?: Array<{ label: string; value: string | number; disabled?: boolean }>;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, options, children, className = "", id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={selectId} className="text-xs font-bold uppercase tracking-wider text-[#2E3A4B]">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`w-full h-11 pl-3.5 pr-10 rounded-[10px] bg-white border text-sm text-[#2E3A4B] appearance-none transition-all focus:outline-none focus:ring-2 focus:ring-[#F2697A]/40 focus:border-[#F2697A] cursor-pointer ${
              error ? "border-[#D9435A] focus:border-[#D9435A]" : "border-[#E6E8EC]"
            } ${className}`}
            {...props}
          >
            {options
              ? options.map((opt) => (
                  <option key={String(opt.value)} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[#8A94A3]">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error && <span className="text-xs font-medium text-[#D9435A] mt-0.5">{error}</span>}
        {helperText && !error && <span className="text-xs text-[#8A94A3] mt-0.5">{helperText}</span>}
      </div>
    );
  }
);

Select.displayName = "Select";
