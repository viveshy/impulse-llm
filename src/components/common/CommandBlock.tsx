"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CommandBlock({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard?.writeText(command).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-[8px] border border-border-strong bg-[#0a0a0c] px-[12px] py-[9px]">
      <code className="truncate text-[13px] text-ink">
        <span className="text-ink-4">$ </span>
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        className="flex flex-none items-center gap-[6px] rounded-[5px] border border-border px-[8px] py-[3px] text-[12px] text-ink-2 transition-colors hover:border-border-strong hover:text-ink"
      >
        {copied ? (
          <>
            <Check size={12} className="text-ok" /> Copied
          </>
        ) : (
          <>
            <Copy size={12} /> Copy
          </>
        )}
      </button>
    </div>
  );
}
