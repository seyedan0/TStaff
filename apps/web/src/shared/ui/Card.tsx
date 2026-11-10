import React from "react";

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "glass" | "solid" | "elevated" | "default" | "outlined";
  padding?: "none" | "sm" | "md" | "lg";
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  variant = "glass",
  padding = "md",
  className = "",
  ...props
}) => {
  const paddingStyle = {
    none: "p-0",
    sm: "p-3.5 md:p-4",
    md: "p-5 md:p-6",
    lg: "p-6 md:p-8",
  }[padding];

  const variantStyle = {
    glass: `apple-glass-card rounded-apple-xl ${paddingStyle}`,
    solid: `bg-[#FFFCF5] border border-[#214E3A]/15 rounded-apple-xl ${paddingStyle} shadow-apple-card`,
    default: `bg-[#FFFCF5] border border-[#214E3A]/15 rounded-apple-xl ${paddingStyle} shadow-apple-card`,
    outlined: `bg-[#FFFCF5] border border-[#214E3A]/25 rounded-apple-xl ${paddingStyle}`,
    elevated: `apple-glass-card shadow-apple-elevated border border-[#214E3A]/20 rounded-apple-2xl ${padding === "md" ? "p-6" : paddingStyle}`,
  }[variant];

  return (
    <div className={`${variantStyle} ${className}`} {...props}>
      {(title || action) && (
        <div className="mb-4 flex items-start justify-between gap-4 border-b border-[#214E3A]/10 pb-3">
          <div>
            {title && (
              <h3 className="flex items-center gap-2 text-base font-bold text-[#214031]">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="mt-1 text-xs leading-relaxed text-[#43584A]">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
};
