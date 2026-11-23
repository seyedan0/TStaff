import React, { useId } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  icon,
  className = "",
  id,
  ...props
}) => {
  const generatedId = useId();
  const inputId = id || props.name || generatedId;

  return (
    <div className="flex w-full flex-col gap-1.5 text-right">
      {label && (
        <label
          htmlFor={inputId}
          className="flex items-center justify-between text-xs font-semibold text-[#162F48]"
        >
          <span>{label}</span>
          {props.required && <span className="text-[11px] text-[#B43A31]">* الزامی</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="pointer-events-none absolute right-3.5 flex items-center justify-center text-[#50677A]">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full rounded-apple-md border bg-white text-sm text-[#162F48] placeholder-[#5B7182] ${
            error
              ? "border-[#B43A31] focus:ring-[#B43A31]/25"
              : "border-[#087674]/20 hover:border-[#087674]/40 focus:border-[#087674] focus:ring-[#087674]/20"
          } px-3.5 py-2.5 outline-none transition-all duration-150 focus:ring-2 ${
            icon ? "pr-10" : ""
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <span className="mt-0.5 flex items-center gap-1 text-xs font-medium text-[#B43A31]">
          <svg className="h-3.5 w-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </span>
      ) : hint ? (
        <span className="text-[11px] text-[#50677A]">{hint}</span>
      ) : null}
    </div>
  );
};
