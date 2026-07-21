"use client";

import { Search } from "lucide-react";
import { useCommandMenu } from "@/components/layout/command-menu-context";

/** Hero search on the landing page. Opens the same ⌘K command palette as the app -
 *  no redirect, no new tab. (⌘K itself is handled globally by CommandMenuProvider.) */
export function LandingSearch() {
  const { setOpen } = useCommandMenu();

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="flex h-[50px] w-full max-w-[600px] items-center gap-[12px] rounded-[10px] border border-border-strong bg-panel px-[15px] text-left transition-colors hover:border-[#34343a]"
    >
      <Search size={17} className="flex-none text-ink-3" />
      <span className="flex-1 text-[17px] text-ink-4">
        Search models, providers, capabilities…
      </span>
      <span className="flex gap-[3px]">
        <kbd className="rounded-[4px] border border-border px-[5px] py-px text-[13px] text-ink-4">⌘</kbd>
        <kbd className="rounded-[4px] border border-border px-[5px] py-px text-[13px] text-ink-4">K</kbd>
      </span>
    </button>
  );
}
