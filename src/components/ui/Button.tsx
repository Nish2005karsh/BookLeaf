import React, { forwardRef } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = "primary",
      size = "md",
      loading = false,
      className = "",
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center font-bold transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#F2697A]/40 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-full cursor-pointer";

    const sizeStyles = {
      sm: "h-9 px-4 text-xs tracking-wide min-h-[36px]",
      md: "h-11 px-6 text-sm tracking-wide min-h-[44px]",
      lg: "h-12 px-8 text-base tracking-wide min-h-[48px]",
    }[size];

    const variantStyles = {
      primary: "bg-[#F2697A] text-white hover:bg-[#E04F62] active:bg-[#D43D51] shadow-sm",
      secondary: "bg-[#111111] text-white hover:bg-[#2b2b2b] active:bg-[#000000] shadow-sm",
      ghost: "bg-transparent text-[#F2697A] border-2 border-[#F2697A] hover:bg-[#FDE4E8]/50 active:bg-[#FDE4E8]",
      danger: "bg-[#D9435A] text-white hover:bg-[#C2354B] active:bg-[#A92A3D] shadow-sm",
      outline: "bg-white text-[#2E3A4B] border border-[#E6E8EC] hover:bg-[#FFF5F6] hover:border-[#F3C9D0] active:bg-[#FDE4E8]/30",
    }[variant];

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {loading ? (
          <div className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8H4z"
              />
            </svg>
            <span>{children}</span>
          </div>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
