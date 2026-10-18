import React, { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-wider text-[#2E3A4B]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`h-11 px-3.5 rounded-[10px] bg-white border text-sm text-[#2E3A4B] placeholder:text-[#8A94A3] transition-all focus:outline-none focus:ring-2 focus:ring-[#F2697A]/40 focus:border-[#F2697A] ${
            error ? "border-[#D9435A] focus:border-[#D9435A] focus:ring-[#D9435A]/30" : "border-[#E6E8EC]"
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs font-medium text-[#D9435A] mt-0.5">{error}</span>}
        {helperText && !error && <span className="text-xs text-[#8A94A3] mt-0.5">{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helperText, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5 text-left">
        {label && (
          <label htmlFor={inputId} className="text-xs font-bold uppercase tracking-wider text-[#2E3A4B]">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          className={`p-3.5 rounded-[10px] bg-white border text-sm text-[#2E3A4B] placeholder:text-[#8A94A3] transition-all focus:outline-none focus:ring-2 focus:ring-[#F2697A]/40 focus:border-[#F2697A] ${
            error ? "border-[#D9435A] focus:border-[#D9435A] focus:ring-[#D9435A]/30" : "border-[#E6E8EC]"
          } ${className}`}
          {...props}
        />
        {error && <span className="text-xs font-medium text-[#D9435A] mt-0.5">{error}</span>}
        {helperText && !error && <span className="text-xs text-[#8A94A3] mt-0.5">{helperText}</span>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";
