import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { retirementLabel, type RetiringItem } from "@/lib/catalog/select";
import { modelHref } from "@/lib/routes";
import { formatDate, formatDaysLeft } from "@/lib/utils/format";
import { Badge, type Tone } from "@/components/ui/Badge";

export function urgency(daysLeft: number): Tone {
  if (daysLeft < 0) return "neutral";
  if (daysLeft <= 30) return "err";
  if (daysLeft <= 90) return "warn";
  return "neutral";
}

/** Each host's retirement, dated when it falls after the item's first one. */
export function RetirementHosts({ item }: { item: RetiringItem }) {
  return (
    <ul className="space-y-[2px]">
      {item.hosts.map((h) => (
        <li key={`${h.host}-${h.date}`}>
          {retirementLabel(h)}
          {h.date !== item.date && <span className="whitespace-nowrap text-ink-3"> · {formatDate(h.date)}</span>}
        </li>
      ))}
    </ul>
  );
}

/** The hosts retiring it on the first date, and how many retirements follow. */
function firstHosts(it: RetiringItem): string {
  const first = it.hosts.filter((h) => h.date === it.date).map(retirementLabel);
  const later = it.hosts.length - first.length;
  return `${first.join(", ")}${later ? `, then ${later} more` : ""}`;
}

export function RetiringList({ items }: { items: RetiringItem[] }) {
  if (!items.length) {
    return <p className="rounded-[12px] border border-border bg-panel p-4 text-[14px] text-ink-3">Nothing scheduled.</p>;
  }
  return (
    <ul className="divide-y divide-border-2 rounded-[12px] border border-border bg-panel shadow-[var(--shadow)]">
      {items.map((it) => (
        <li key={it.model.slug} className="flex items-start gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <Link href={modelHref(it.model)} className="font-medium text-ink hover:text-accent hover:underline">
              {it.model.name}
            </Link>
            <div className="text-[13px] text-ink-3">
              {it.model.labName} · on {firstHosts(it)}
            </div>
            {it.successor && (
              <div className="mt-[2px] text-[13px] text-ink-3">
                Move to{" "}
                <Link href={modelHref(it.successor)} className="text-ink-2 hover:text-accent hover:underline">
                  {it.successor.name}
                </Link>
              </div>
            )}
          </div>
          <div className="flex flex-none flex-col items-end gap-1">
            <Badge tone={urgency(it.daysLeft)} icon={<CalendarClock size={12} />}>
              {formatDaysLeft(it.daysLeft)}
            </Badge>
            <span className="whitespace-nowrap text-[12.5px] text-ink-3">{formatDate(it.date)}</span>
          </div>
        </li>
      ))}
    </ul>
  );
}
