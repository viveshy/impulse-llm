"use client";

import { Search } from "lucide-react";
import { useCommandMenu } from "@/components/layout/command-menu-context";

export function HeroSearch({ placeholder }: { placeholder: string }) {
  const { setOpen } = useCommandMenu();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="group flex h-[52px] w-full max-w-[560px] items-center gap-3 rounded-[12px] border border-border-strong bg-panel px-4 text-left text-[16px] text-ink-3 shadow-[var(--shadow)] transition-colors hover:border-accent-line"
    >
      <Search size={18} strokeWidth={1.8} className="flex-none text-ink-3 group-hover:text-accent" />
      <span className="truncate">{placeholder}</span>
      <kbd className="ml-auto hidden rounded-[5px] border border-border px-[6px] py-px font-sans text-[12.5px] text-ink-3 sm:inline">
        ⌘K
      </kbd>
    </button>
  );
}
