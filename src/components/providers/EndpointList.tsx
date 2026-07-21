import type { Endpoint } from "@/lib/domain/types";

export function EndpointList({ endpoints }: { endpoints: Endpoint[] }) {
  return (
    <div className="overflow-hidden rounded-[10px] border border-border">
      {endpoints.map((e) => (
        <div
          key={e.id}
          className="grid grid-cols-[54px_minmax(150px,1.2fr)_minmax(110px,1fr)_80px] items-center gap-[14px] border-b border-border-2 px-[15px] py-[11px] last:border-0"
        >
          <span className="rounded-[4px] border border-border-strong py-[2px] text-center text-[12px] tracking-[0.04em] text-ink-2">
            {e.method}
          </span>
          <span className="truncate text-[15px] text-ink">{e.path}</span>
          <span className="truncate text-[15px] text-ink-3">{e.name}</span>
          <span className="text-right text-[13px] text-ink-4">
            {e.streaming ? (
              <span className="inline-flex items-center gap-[5px] text-ink-2">
                <span className="h-[5px] w-[5px] rounded-full bg-ok" />
                Stream
              </span>
            ) : (
              "-"
            )}
          </span>
        </div>
      ))}
    </div>
  );
}
