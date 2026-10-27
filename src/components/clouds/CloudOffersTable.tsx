import Link from "next/link";
import { CalendarClock } from "lucide-react";
import type { CloudOffer } from "@/lib/catalog/clouds";
import { qualifiers } from "@/lib/catalog/detail";
import { daysBetween, retirementScope, type HostRetirement } from "@/lib/catalog/select";
import { ZONES, type ZoneId } from "@/lib/clouds";
import { modelHref } from "@/lib/routes";
import { formatDate, formatDaysLeft, formatReleaseDate } from "@/lib/utils/format";
import { urgency } from "@/components/home/RetiringList";
import { Badge } from "@/components/ui/Badge";
import { LabMark } from "@/components/ui/BrandMark";
import { Delta, PricePair } from "@/components/ui/Price";

const ZONE_NAME = new Map(ZONES.map((z) => [z.id, z.name]));

/** "US, Europe, Global". */
export const zoneNames = (zones: ZoneId[]) => zones.map((z) => ZONE_NAME.get(z)).join(", ");

/** `named`: the cloud sells through more than one service, so say which one retires it. */
function Retires({ offer, today, named }: { offer: CloudOffer; today: string; named: boolean }) {
  const r = offer.retires;
  if (!r) return <span className="text-ink-3">-</span>;
  const days = daysBetween(today, r.date);
  const when = (x: HostRetirement) => [formatDate(x.date), named ? x.host : null, retirementScope(x)].filter(Boolean).join(" · ");
  return (
    <div className="space-y-1">
      {/* Only a version or region going isn't urgent: the model itself stays. */}
      <Badge tone={r.only ? undefined : urgency(days)} icon={<CalendarClock size={12} aria-hidden />}>
        {r.only ? "Partly retires" : "Retires"} {formatDaysLeft(days)}
      </Badge>
      <div className="text-[13px] text-ink-3">{when(r)}</div>
      {offer.sooner && <div className="text-[13px] text-ink-3">First: {when(offer.sooner)}</div>}
    </div>
  );
}

/**
 * Frontier models on one cloud: its cheapest price for each against the lab's own API, the zones it is listed in and
 * the next retirement. `services`: the cloud sells through more than one, so each row says which.
 */
export function CloudOffersTable({
  offers,
  today,
  services,
  regions,
  released = false,
}: {
  offers: CloudOffer[];
  today: string;
  services: boolean;
  regions: boolean;
  released?: boolean;
}) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Model</th>
            {released && <th className="hidden md:table-cell">Released</th>}
            <th className="num">Price, in / out per 1M</th>
            <th className="num hidden sm:table-cell">vs the lab&rsquo;s API</th>
            {regions && <th className="hidden lg:table-cell">Regions listed</th>}
            <th className="hidden sm:table-cell">Next retirement</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((o) => {
            const where = o.best ? [services ? o.best.host.name : "", ...qualifiers(o.best)].filter(Boolean).join(" · ") : "";
            const lab = o.model.reference.host.name;
            return (
              <tr key={o.model.slug}>
                <td className="wrap">
                  <div className="flex items-center gap-2">
                    <LabMark labId={o.model.labId} name={o.model.labName} size={22} />
                    <Link href={modelHref(o.model)} className="font-medium text-ink hover:text-accent hover:underline">
                      {o.model.name}
                    </Link>
                  </div>
                  <div className="mt-[2px] text-[13px] text-ink-3">
                    {o.model.labName}
                    {services && ` · ${[...new Set(o.listings.map((l) => l.host.name))].join(", ")}`}
                  </div>
                  {/* Phones: the regions and the retirement go under the model. */}
                  <div className="mt-2 space-y-1 empty:hidden sm:hidden">
                    {regions && o.zones.length > 0 && (
                      <div className="text-[13px] text-ink-3">Regions: {zoneNames(o.zones)}</div>
                    )}
                    {o.retires && <Retires offer={o} today={today} named={services} />}
                  </div>
                </td>
                {released && (
                  <td className="hidden text-ink-2 md:table-cell">
                    {o.model.releaseDate ? formatReleaseDate(o.model.releaseDate) : "-"}
                  </td>
                )}
                <td className="num">
                  {o.best ? (
                    <PricePair input={o.best.pricing.inputPerMTok} output={o.best.pricing.outputPerMTok} />
                  ) : (
                    <span className="text-ink-3">-</span>
                  )}
                  {where && <div className="text-[12px] text-ink-3">{where}</div>}
                  {o.vsLab !== null && Math.round(o.vsLab * 100) !== 0 && (
                    <div className="text-[12px] text-ink-3 sm:hidden">
                      <Delta ratio={o.vsLab} /> vs {lab}
                    </div>
                  )}
                </td>
                <td className="num hidden sm:table-cell">
                  {o.vsLab === null ? (
                    <span className="text-ink-3">-</span>
                  ) : (
                    <>
                      <Delta ratio={o.vsLab} />
                      <div className="text-[12px] text-ink-3">vs {lab}</div>
                    </>
                  )}
                </td>
                {regions && (
                  <td className="wrap hidden text-[13.5px] text-ink-2 lg:table-cell">
                    {o.zones.length ? zoneNames(o.zones) : <span className="text-ink-3">-</span>}
                  </td>
                )}
                <td className="hidden sm:table-cell">
                  <Retires offer={o} today={today} named={services} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
