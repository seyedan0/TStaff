import React from "react";

export type BadgeVariant =
  | "success"
  | "info"
  | "warning"
  | "danger"
  | "neutral"
  | "indigo";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "neutral",
  size = "md",
  dot = false,
  className = "",
}) => {
  const variantStyles = {
    success: "bg-apple-green/15 text-apple-green border-apple-green/30",
    info: "bg-apple-blue/15 text-apple-blue border-apple-blue/30",
    warning: "bg-apple-amber/15 text-apple-amber border-apple-amber/30",
    danger: "bg-apple-red/15 text-apple-red border-apple-red/30",
    neutral: "bg-slate-800/80 text-slate-300 border-white/10",
    indigo: "bg-apple-indigo/15 text-apple-indigo border-apple-indigo/30",
  }[variant];

  const dotColor = {
    success: "bg-apple-green",
    info: "bg-apple-blue",
    warning: "bg-apple-amber",
    danger: "bg-apple-red",
    neutral: "bg-slate-400",
    indigo: "bg-apple-indigo",
  }[variant];

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${variantStyles} ${sizeStyles} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor} animate-pulse`}
        />
      )}
      <span>{children}</span>
    </span>
  );
};

