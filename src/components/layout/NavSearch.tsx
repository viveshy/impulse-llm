"use client";

import { Search } from "lucide-react";
import { useCommandMenu } from "./command-menu-context";

/** The compact nav search button - opens the ⌘K command palette. Shared by the app
 *  TopNav and the landing header so search behaves identically everywhere. */
export function NavSearch() {
  const { setOpen } = useCommandMenu();
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-[32px] w-[clamp(170px,22vw,300px)] flex-none items-center gap-2 rounded-[7px] border border-border-strong bg-elevated px-[10px] text-[14px] text-ink-3 transition-colors hover:text-ink-2"
    >
      <Search size={14} className="flex-none" />
      <span className="truncate">Search…</span>
      <span className="ml-auto hidden flex-none gap-[3px] sm:flex">
        <kbd className="rounded-[3px] border border-border px-[4px] text-[12px] leading-[15px] text-ink-4">⌘</kbd>
        <kbd className="rounded-[3px] border border-border px-[4px] text-[12px] leading-[15px] text-ink-4">K</kbd>
      </span>
    </button>
  );
}
