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
    "apple-btn rounded-apple-md font-medium inline-flex items-center justify-center gap-2 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#214E3A]/35 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]";

  const variantClasses = {
    primary:
      "bg-[#214E3A] hover:bg-[#183B2D] text-white shadow-sm border border-[#183B2D]",
    secondary:
      "bg-[#EAE5D7] hover:bg-[#DDD5C3] text-[#214031] border border-[#214E3A]/15 hover:border-[#214E3A]/30",
    danger:
      "bg-[#D94F3D] hover:bg-[#C03F2E] text-white shadow-sm border border-[#B53727]",
    ghost:
      "bg-transparent hover:bg-[#214E3A]/10 text-[#214031] hover:text-[#183B2D] border border-transparent",
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
