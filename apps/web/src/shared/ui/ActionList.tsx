import { ArrowUpLeft, CheckCheck, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";

export function ActionList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { to: string; title: string; detail?: string }[];
}) {
  return (
    <section className="atlas-panel">
      <h2>
        <ListChecks aria-hidden="true" size={20} />
        {title}
      </h2>
      {items.length ? (
        items.map((item) => (
          <Link className="atlas-row" key={item.to} to={item.to}>
            <strong>{item.title}</strong>
            <small>{item.detail}</small>
            <ArrowUpLeft aria-hidden="true" size={16} />
          </Link>
        ))
      ) : (
        <p className="atlas-clear">
          <CheckCheck size={22} />
          {empty}
        </p>
      )}
    </section>
  );
}
