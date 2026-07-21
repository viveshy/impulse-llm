import { clsx } from "@/lib/utils/clsx";
import type { DeprecationStatus } from "@/lib/domain/types";

const CONFIG: Record<DeprecationStatus, { color: string; label: string }> = {
  active: { color: "bg-ok", label: "Active" },
  deprecating: { color: "bg-warn", label: "Deprecating" },
  deprecated: { color: "bg-err", label: "Deprecated" },
  preview: { color: "bg-accent", label: "Preview" },
};

export function StatusDot({
  status,
  className,
}: {
  status: DeprecationStatus;
  className?: string;
}) {
  const { color, label } = CONFIG[status];
  return (
    <span
      className={clsx("inline-block h-[7px] w-[7px] flex-none rounded-full", color, className)}
      title={label}
      role="img"
      aria-label={label}
    />
  );
}

export function statusLabel(status: DeprecationStatus): string {
  return CONFIG[status].label;
}
