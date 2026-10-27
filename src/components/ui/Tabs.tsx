"use client";

import { useId, useState, type ReactNode } from "react";
import { clsx } from "@/lib/utils/clsx";

export function Tabs({ tabs }: { tabs: { id: string; label: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const base = useId();
  return (
    <div>
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-border [scrollbar-width:none]">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`${base}-${t.id}-tab`}
            aria-controls={`${base}-${t.id}`}
            aria-selected={active === t.id}
            onClick={() => setActive(t.id)}
            className={clsx(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-[14px] transition-colors",
              active === t.id ? "border-accent font-medium text-ink" : "border-transparent text-ink-3 hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${base}-${t.id}`}
          aria-labelledby={`${base}-${t.id}-tab`}
          hidden={active !== t.id}
          className="pt-3"
        >
          {t.content}
        </div>
      ))}
    </div>
  );
}
