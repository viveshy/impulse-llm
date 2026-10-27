"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { clsx } from "@/lib/utils/clsx";

export function CopyButton({ text, label = "Copy", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // clipboard blocked: nothing useful to do
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Copied" : `${label}: ${text}`}
      title={copied ? "Copied" : label}
      className={clsx(
        "inline-grid h-7 w-7 flex-none place-items-center rounded-[6px] text-ink-3 transition-colors hover:bg-hover hover:text-ink",
        className,
      )}
    >
      {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
    </button>
  );
}

/** A model id in monospace with a copy button. */
export function CopyId({ id, className }: { id: string; className?: string }) {
  return (
    <span className={clsx("inline-flex min-w-0 items-center gap-1", className)}>
      <code className="truncate font-mono text-[13px] text-ink-2">{id}</code>
      <CopyButton text={id} label="Copy model id" />
    </span>
  );
}
