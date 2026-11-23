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
    success: "bg-[#087674]/10 text-[#087674] border-[#087674]/25",
    info: "bg-[#087674]/12 text-[#112A43] border-[#087674]/30",
    warning: "bg-[#A65D31]/12 text-[#854621] border-[#A65D31]/30",
    danger: "bg-[#B43A31]/12 text-[#B53727] border-[#B43A31]/35",
    neutral: "bg-[#E1EEF7] text-[#28475F] border-[#087674]/15",
    indigo: "bg-[#455EA4]/12 text-[#162F48] border-[#455EA4]/25",
  }[variant];

  const dotColor = {
    success: "bg-[#087674]",
    info: "bg-[#087674]",
    warning: "bg-[#A65D31]",
    danger: "bg-[#B43A31]",
    neutral: "bg-[#50677A]",
    indigo: "bg-[#455EA4]",
  }[variant];

  const sizeStyles = {
    sm: "px-2 py-0.5 text-[11px]",
    md: "px-2.5 py-1 text-xs",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${variantStyles} ${sizeStyles} ${className}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotColor} animate-pulse`}
        />
      )}
      <span>{children}</span>
    </span>
  );
};
