import Link from "next/link";
import type { ReactNode } from "react";
import { clsx } from "@/lib/utils/clsx";

const base =
  "inline-flex h-8 items-center gap-[6px] whitespace-nowrap rounded-full border px-3 text-[13.5px] transition-colors";

/** A filter link; `active` marks the current choice. */
export function Chip({
  href,
  active,
  children,
  count,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
  count?: number;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={active ? "true" : undefined}
      className={clsx(
        base,
        active
          ? "border-ink bg-ink text-bg"
          : "border-border bg-panel text-ink-2 hover:border-border-strong hover:text-ink",
      )}
    >
      {children}
      {count !== undefined && <span className={active ? "text-bg/70" : "text-ink-4"}>{count}</span>}
    </Link>
  );
}
