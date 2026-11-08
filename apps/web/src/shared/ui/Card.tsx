import React from "react";

export interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "glass" | "solid" | "elevated";
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  variant = "glass",
  className = "",
  ...props
}) => {
  const variantStyle = {
    glass: "apple-glass-card rounded-apple-xl p-5 md:p-6",
    solid: "bg-slate-900 border border-slate-800 rounded-apple-xl p-5 md:p-6",
    elevated:
      "apple-glass-card shadow-apple-elevated border border-white/10 rounded-apple-2xl p-6",
  }[variant];

  return (
    <div className={`${variantStyle} ${className}`} {...props}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-4 mb-4 pb-3 border-b border-white/5">
          <div>
            {title && (
              <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
                {title}
              </h3>
            )}
            {subtitle && (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
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
