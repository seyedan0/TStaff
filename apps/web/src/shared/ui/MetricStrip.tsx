import React from "react";
import { Link } from "react-router-dom";

export interface MetricItem {
  label: string;
  value: number | string;
  detail?: string;
  tone?: "default" | "warning" | "success";
  to?: string;
}

export const MetricStrip: React.FC<{ label: string; items: MetricItem[] }> = ({
  label,
  items,
}) => (
  <section aria-label={label} className="metric-strip">
    {items.map((item) => {
      const content = (
        <>
          <span className="metric-strip__label">{item.label}</span>
          <strong
            className={`metric-strip__value metric-strip__value--${item.tone ?? "default"}`}
          >
            {item.value}
          </strong>
          {item.detail && (
            <span className="metric-strip__detail">{item.detail}</span>
          )}
        </>
      );
      return item.to ? (
        <Link
          key={item.label}
          to={item.to}
          className="metric-strip__item metric-strip__item--link"
        >
          {content}
        </Link>
      ) : (
        <div key={item.label} className="metric-strip__item">
          {content}
        </div>
      );
    })}
  </section>
);
