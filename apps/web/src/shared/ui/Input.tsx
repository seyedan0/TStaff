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
    <div className="w-full flex flex-col gap-1.5 text-right">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-slate-300 flex items-center justify-between"
        >
          <span>{label}</span>
          {props.required && <span className="text-apple-red text-[11px]">* الزامی</span>}
        </label>
      )}
      <div className="relative flex items-center">
        {icon && (
          <span className="absolute right-3.5 text-slate-400 pointer-events-none flex items-center justify-center">
            {icon}
          </span>
        )}
        <input
          id={inputId}
          className={`w-full bg-slate-900/60 text-slate-100 placeholder-slate-500 text-sm rounded-apple-md border ${
            error
              ? "border-apple-red focus:ring-apple-red/30"
              : "border-white/10 hover:border-white/20 focus:border-apple-blue focus:ring-apple-blue/30"
          } px-3.5 py-2.5 outline-none focus:ring-2 transition-all duration-150 ${
            icon ? "pr-10" : ""
          } ${className}`}
          {...props}
        />
      </div>
      {error ? (
        <span className="text-xs text-apple-red font-medium flex items-center gap-1 mt-0.5">
          <svg className="w-3.5 h-3.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </span>
      ) : hint ? (
        <span className="text-[11px] text-slate-400">{hint}</span>
      ) : null}
    </div>
  );
};

