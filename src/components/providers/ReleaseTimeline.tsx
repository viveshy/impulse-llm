import { clsx } from "@/lib/utils/clsx";

export interface TimelineItem {
  date: string;
  name: string;
}

/** Editorial horizontal timeline: a hairline, monochrome dots, date + label. */
export function ReleaseTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex border-t border-border">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <div key={`${item.date}-${item.name}`} className="relative flex-1 pr-2 pt-4">
            <span
              className={clsx(
                "absolute -top-1 left-0 h-[7px] w-[7px] rounded-full border-2 border-bg",
                last ? "bg-ink" : "bg-ink-3",
              )}
            />
            <div className="text-[13px] text-ink-4">{item.date}</div>
            <div className={clsx("mt-[2px] text-[15px]", last ? "text-ink" : "text-ink-2")}>
              {item.name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
