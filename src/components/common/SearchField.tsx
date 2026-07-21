"use client";

import { Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { clsx } from "@/lib/utils/clsx";

/**
 * Debounced search input for the app's list pages (models, providers) - a
 * persistent in-page search that complements the ⌘K command menu. Controlled by
 * the caller's `value`; emits `onChange` after a short debounce so URL/state
 * updates don't fire on every keystroke.
 */
export function SearchField({
  value,
  onChange,
  placeholder = "Search…",
  className,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const [local, setLocal] = useState(value);
  const [syncedValue, setSyncedValue] = useState(value);
  const ref = useRef<HTMLInputElement>(null);

  // Keep local text in sync when the source value changes elsewhere (e.g. cleared
  // filters), adjusting during render rather than in an effect - no cascading render.
  if (value !== syncedValue) {
    setSyncedValue(value);
    setLocal(value);
  }

  // debounce emitting upward
  useEffect(() => {
    if (local === value) return;
    const t = setTimeout(() => onChange(local), 180);
    return () => clearTimeout(t);
  }, [local, value, onChange]);

  return (
    <div className={clsx("relative flex items-center", className)}>
      <Search size={14} className="pointer-events-none absolute left-[10px] text-ink-4" />
      <input
        ref={ref}
        type="search"
        value={local}
        autoFocus={autoFocus}
        onChange={(e) => setLocal(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && local) {
            e.stopPropagation();
            setLocal("");
            onChange("");
          }
        }}
        placeholder={placeholder}
        className="h-[32px] w-full rounded-[7px] border border-border-strong bg-elevated pl-[31px] pr-[28px] text-[15px] text-ink placeholder:text-ink-3 transition-colors hover:border-[#3a3a41] focus:border-accent-line focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {local && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            setLocal("");
            onChange("");
            ref.current?.focus();
          }}
          className="absolute right-[7px] grid h-[18px] w-[18px] place-items-center rounded-[4px] text-ink-4 transition-colors hover:bg-hover hover:text-ink"
        >
          <X size={13} />
        </button>
      )}
    </div>
  );
}
