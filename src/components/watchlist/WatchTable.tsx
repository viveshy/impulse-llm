import Link from "next/link";
import { AlertTriangle, CalendarClock, X } from "lucide-react";
import { qualifiers } from "@/lib/catalog/detail";
import { retirementScope, type HostRetirement } from "@/lib/catalog/select";
import { isMoving, type WatchRow } from "@/lib/catalog/watch";
import { hostHref, modelHref } from "@/lib/routes";
import { formatDate, formatDaysLeft } from "@/lib/utils/format";
import { watchKey, type WatchItem } from "@/lib/watchlist";
import { urgency } from "@/components/home/RetiringList";
import { Badge } from "@/components/ui/Badge";
import { HostMark } from "@/components/ui/BrandMark";
import { Delta, PricePair } from "@/components/ui/Price";
import { EditLink } from "./EditLink";

function Notice({ row }: { row: WatchRow }) {
  if (!row.noticeUrl) return null;
  return (
    <a href={row.noticeUrl} target="_blank" rel="noopener noreferrer" className="text-[12.5px] text-ink-3 hover:text-ink hover:underline">
      {row.hostName}&rsquo;s notice
    </a>
  );
}

/** The host's retirements, earliest first, each with the part it takes when that isn't all of it. */
function Dates({ retirements }: { retirements: HostRetirement[] }) {
  return (
    <ul className="space-y-[2px] text-[13px] text-ink-2">
      {retirements.map((r) => (
        <li key={r.date}>
          {formatDate(r.date)}
          {retirementScope(r) && <span className="text-ink-3"> · {retirementScope(r)}</span>}
        </li>
      ))}
    </ul>
  );
}

function Status({ row, items }: { row: WatchRow; items: WatchItem[] }) {
  const gone = <AlertTriangle size={12} aria-hidden />;
  switch (row.state) {
    case "model-gone":
      return (
        <div className="space-y-1">
          <Badge tone="err" icon={gone}>Not listed</Badge>
          <div className="text-[13px] text-ink-3">No host in the catalog lists this model.</div>
        </div>
      );
    case "host-gone": {
      const n = row.otherHosts ?? 0;
      return (
        <div className="space-y-1">
          <Badge tone="err" icon={gone}>{row.hostKnown ? `Not on ${row.hostName}` : "Host not found"}</Badge>
          <div className="text-[13px] text-ink-3">
            {row.hostKnown
              ? `${row.hostName} doesn't list it${n ? `; ${n} other ${n === 1 ? "host does" : "hosts do"}.` : ", and no other host serves it now."}`
              : `No host in the catalog goes by “${row.hostSlug}”.`}
          </div>
        </div>
      );
    }
    case "pin-gone": {
      const unpinned = items.map((i) => (watchKey(i) === row.key ? { model: i.model, host: i.host } : i));
      return (
        <div className="space-y-1">
          <Badge tone="err" icon={gone}>Pinned version gone</Badge>
          <div className="text-[13px] text-ink-3">
            {row.hostName} no longer lists the version you pinned.{" "}
            <EditLink items={unpinned} className="text-accent hover:underline">
              Watch all its listings instead
            </EditLink>
          </div>
        </div>
      );
    }
    case "retired":
      return (
        <div className="space-y-1">
          <Badge tone="err" icon={gone}>Retired</Badge>
          {row.retiredOn && (
            <div className="text-[13px] text-ink-2">
              {formatDate(row.retiredOn)}
              {row.except && <span className="text-ink-3"> · all but {row.except.join(", ")}</span>}
            </div>
          )}
          {/* What the host still serves may have its own date. */}
          {row.retirements.length > 0 && <Dates retirements={row.retirements} />}
          <Notice row={row} />
        </div>
      );
    case "retiring":
      return (
        <div className="space-y-1">
          {/* Only a version, variant or region retiring isn't urgent: the model itself stays. */}
          <Badge
            tone={row.partly ? undefined : urgency(row.daysLeft!)}
            icon={<CalendarClock size={12} aria-hidden />}
            title={row.partly ? "Only part of what the host offers retires; the rest stays." : undefined}
          >
            {row.partly ? "Partly retires" : "Retires"} {formatDaysLeft(row.daysLeft!)}
          </Badge>
          <Dates retirements={row.retirements} />
          <Notice row={row} />
        </div>
      );
    case "not-before":
      return (
        <div className="space-y-1">
          <Badge title="The host promises it until at least this day. No shutdown is scheduled yet.">
            No retirement before {formatDate(row.notBefore!)}
          </Badge>
          <div>
            <Notice row={row} />
          </div>
        </div>
      );
    default:
      return <span className="text-[13.5px] text-ink-3">No date announced</span>;
  }
}

/** `stacked`: under the model's name on small screens, where a missing value is left out rather than dashed. */
function Next({ row, stacked = false }: { row: WatchRow; stacked?: boolean }) {
  const s = row.successor;
  const moving = isMoving(row);
  if (!s) {
    if (moving && row.model) {
      return (
        <div className="text-[13px] text-ink-3">
          Nothing newer in its line.{" "}
          <Link href={`${modelHref(row.model)}#alternatives`} className="text-accent hover:underline">
            See alternatives
          </Link>
        </div>
      );
    }
    return stacked ? null : <span className="text-ink-3">-</span>;
  }
  return (
    <div>
      <div className="text-[12.5px] text-ink-3">{moving ? "Move to" : "Newer"}</div>
      <Link href={modelHref(s.model)} className="font-medium text-ink hover:text-accent hover:underline">
        {s.model.name}
      </Link>
      {/* A host the catalog doesn't know: nothing to say about what it serves. */}
      {row.hostKnown && (
        <div className="text-[13px] text-ink-3">
          {s.listing ? (
            <>
              on {row.hostName}
              {s.delta !== null && (
                <>
                  {" · "}
                  <Delta ratio={s.delta} /> price
                </>
              )}
            </>
          ) : s.retiredHere ? (
            `retired on ${row.hostName}`
          ) : (
            `not on ${row.hostName} yet`
          )}
        </div>
      )}
    </div>
  );
}

function Price({ row, stacked = false }: { row: WatchRow; stacked?: boolean }) {
  const l = row.listing;
  if (!l) return stacked ? null : <span className="text-ink-3">-</span>;
  const move = row.priceMove;
  const where = move && move.listing.id !== l.id ? qualifiers(move.listing).join(", ") : "";
  return (
    <div>
      {l.host.kind === "subscription" ? (
        <span className="text-[13px] text-ink-3">In the subscription</span>
      ) : l.priced ? (
        <PricePair input={l.pricing.inputPerMTok} output={l.pricing.outputPerMTok} />
      ) : (
        !stacked && <span className="text-ink-3">-</span>
      )}
      {move && (
        <div className="text-[12.5px] text-ink-3">
          <Delta ratio={move.change} /> on {formatDate(move.at)}
          {where && ` (${where})`}
        </div>
      )}
    </div>
  );
}

function What({ row }: { row: WatchRow }) {
  const l = row.listing;
  const pinned = !!row.item.pin;
  return (
    <div className="min-w-0">
      {row.model ? (
        <Link href={modelHref(row.model)} className="font-medium text-ink hover:text-accent hover:underline">
          {row.name}
        </Link>
      ) : (
        <span className="font-medium text-ink">{row.name}</span>
      )}
      <div className="mt-[2px] flex items-center gap-[6px] text-[13px] text-ink-3">
        <HostMark slug={row.hostSlug} name={row.hostName} size={18} />
        <span>
          on{" "}
          {row.hostKnown ? (
            <Link href={hostHref(row.hostSlug)} className="text-ink-2 hover:text-ink hover:underline">
              {row.hostName}
            </Link>
          ) : (
            <span className="text-ink-2">{row.hostName}</span>
          )}
        </span>
      </div>
      {l && (
        <div className="mt-[2px] text-[12.5px] text-ink-3">
          <code className="break-all font-mono text-[12px] text-ink-2">{l.apiModelId}</code>
          {pinned
            ? qualifiers(l).length > 0 && ` · ${qualifiers(l).join(", ")}`
            : row.hostListings > 1 && ` · all ${row.hostListings} listings`}
        </div>
      )}
    </div>
  );
}

export function WatchTable({ rows, items }: { rows: WatchRow[]; items: WatchItem[] }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Model</th>
            <th className="hidden sm:table-cell">Status</th>
            <th className="hidden md:table-cell">Next model</th>
            <th className="num hidden sm:table-cell">Price, in / out per 1M</th>
            <th>
              <span className="sr-only">Remove</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td className="wrap">
                <What row={row} />
                {/* Phones: everything else under the model. */}
                <div className="mt-2 space-y-2 sm:hidden">
                  <Status row={row} items={items} />
                  <Next row={row} stacked />
                  <Price row={row} stacked />
                </div>
                <div className="mt-2 hidden empty:hidden sm:block md:hidden">
                  <Next row={row} stacked />
                </div>
              </td>
              <td className="wrap hidden sm:table-cell">
                <Status row={row} items={items} />
              </td>
              <td className="wrap hidden md:table-cell">
                <Next row={row} />
              </td>
              <td className="num hidden sm:table-cell">
                <Price row={row} />
              </td>
              <td className="w-[1%]">
                <EditLink
                  items={items.filter((i) => watchKey(i) !== row.key)}
                  aria-label={`Remove ${row.name} on ${row.hostName}`}
                  title="Remove"
                  className="inline-grid h-8 w-8 place-items-center rounded-[8px] text-ink-3 hover:bg-hover hover:text-ink"
                >
                  <X size={16} />
                </EditLink>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
