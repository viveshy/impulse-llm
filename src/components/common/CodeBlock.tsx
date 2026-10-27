import { CopyButton } from "@/components/ui/CopyButton";

/** A code sample with a copy button. */
export function CodeBlock({ code, label }: { code: string; label?: string }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border bg-sunken">
      <div className="flex items-center justify-between border-b border-border px-3 py-[5px]">
        <span className="text-[12.5px] text-ink-3">{label}</span>
        <CopyButton text={code} label="Copy code" />
      </div>
      <pre className="overflow-x-auto px-[14px] py-3 font-mono text-[13px] leading-[1.65] text-ink-2">
        <code>{code}</code>
      </pre>
    </div>
  );
}
