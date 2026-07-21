import { clsx } from "@/lib/utils/clsx";
import { CAPABILITY_SHORT } from "@/lib/domain/capabilities";
import type { CapabilityKey } from "@/lib/domain/types";

/** Small monochrome tag used in rows/cards. */
export function CapabilityBadge({ capability }: { capability: CapabilityKey }) {
  return <Tag>{CAPABILITY_SHORT[capability]}</Tag>;
}

export function Tag({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center whitespace-nowrap rounded-[4px] border border-border px-[6px] py-[1.5px] text-[13px] text-ink-2",
        className,
      )}
    >
      {children}
    </span>
  );
}
