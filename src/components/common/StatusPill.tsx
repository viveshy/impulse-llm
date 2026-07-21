import type { DeprecationStatus } from "@/lib/domain/types";
import { StatusDot, statusLabel } from "./StatusDot";

export function StatusPill({ status, note }: { status: DeprecationStatus; note?: string }) {
  return (
    <span className="inline-flex items-center gap-[7px] rounded-full border border-border-strong px-[10px] py-[2px] text-[13px] font-normal text-ink-2">
      <StatusDot status={status} />
      {statusLabel(status)}
      {note ? ` · ${note}` : ""}
    </span>
  );
}
