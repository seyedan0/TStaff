import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className = "",
  disabled,
  ...props
}) => {
  const baseClasses =
    "apple-btn rounded-apple-md font-medium inline-flex items-center justify-center gap-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#087674]/35 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

  const variantClasses = {
    primary:
      "bg-[#087674] hover:bg-[#112A43] text-white shadow-sm border border-[#112A43]",
    secondary:
      "bg-[#E1EEF7] hover:bg-[#D4E6F2] text-[#162F48] border border-[#087674]/15 hover:border-[#087674]/30",
    danger:
      "bg-[#B43A31] hover:bg-[#9A3029] text-white shadow-sm border border-[#B53727]",
    ghost:
      "bg-transparent hover:bg-[#087674]/10 text-[#162F48] hover:text-[#112A43] border border-transparent",
  }[variant];

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs rounded-apple-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base rounded-apple-lg",
  }[size];

  return (
    <button
      data-button={variant}
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-1 mr-1 h-4 w-4 text-current"
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
      ) : icon ? (
        <span className="inline-flex shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
