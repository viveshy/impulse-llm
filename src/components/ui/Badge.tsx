import type { ReactNode } from "react";
import { clsx } from "@/lib/utils/clsx";

export type Tone = "neutral" | "accent" | "ok" | "warn" | "err";

const TONES: Record<Tone, string> = {
  neutral: "border-border bg-sunken text-ink-2",
  accent: "border-accent-line/40 bg-accent-dim text-accent",
  ok: "border-transparent bg-ok-dim text-ok",
  warn: "border-transparent bg-warn-dim text-warn",
  err: "border-transparent bg-err-dim text-err",
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  className,
  title,
}: {
  tone?: Tone;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={clsx(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-[8px] py-[1px] text-[12.5px] font-medium leading-[20px]",
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
