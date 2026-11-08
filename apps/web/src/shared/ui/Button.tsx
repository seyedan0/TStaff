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
    "apple-btn rounded-apple-md font-medium inline-flex items-center justify-center gap-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-apple-blue/40 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.97]";

  const variantClasses = {
    primary:
      "bg-apple-blue hover:bg-apple-blue-hover text-white shadow-sm border border-blue-400/20",
    secondary:
      "bg-slate-800/80 hover:bg-slate-700/80 text-slate-100 border border-white/10 hover:border-white/20",
    danger:
      "bg-apple-red/90 hover:bg-apple-red text-white shadow-sm border border-red-400/20",
    ghost:
      "bg-transparent hover:bg-white/5 text-slate-300 hover:text-white",
  }[variant];

  const sizeClasses = {
    sm: "px-3 py-1.5 text-xs rounded-apple-sm",
    md: "px-4 py-2.5 text-sm",
    lg: "px-6 py-3 text-base rounded-apple-lg",
  }[size];

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
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

