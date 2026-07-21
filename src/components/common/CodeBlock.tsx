"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

/** Multi-line code block with a header label and copy button (monospace, for code). */
export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="overflow-hidden rounded-[8px] border border-border-strong bg-[#0a0a0c]">
      <div className="flex items-center justify-between border-b border-border px-[12px] py-[7px]">
        <span className="text-[12px] uppercase tracking-[0.08em] text-ink-4">{label}</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-[6px] rounded-[5px] border border-border px-[8px] py-[3px] text-[12px] text-ink-2 transition-colors hover:border-border-strong hover:text-ink"
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
      <pre className="overflow-x-auto px-[13px] py-[12px] font-mono text-[12.5px] leading-[1.65] text-ink-2">
        <code>{code}</code>
      </pre>
    </div>
  );
}
