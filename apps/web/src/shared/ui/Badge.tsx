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
    success: "bg-[#214E3A]/10 text-[#214E3A] border-[#214E3A]/25",
    info: "bg-[#214E3A]/12 text-[#183B2D] border-[#214E3A]/30",
    warning: "bg-[#A65D31]/12 text-[#854621] border-[#A65D31]/30",
    danger: "bg-[#D94F3D]/12 text-[#B53727] border-[#D94F3D]/35",
    neutral: "bg-[#EAE5D7] text-[#304B3D] border-[#214E3A]/15",
    indigo: "bg-[#3A5F4D]/12 text-[#214031] border-[#3A5F4D]/25",
  }[variant];

  const dotColor = {
    success: "bg-[#214E3A]",
    info: "bg-[#214E3A]",
    warning: "bg-[#A65D31]",
    danger: "bg-[#D94F3D]",
    neutral: "bg-[#59675A]",
    indigo: "bg-[#3A5F4D]",
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
