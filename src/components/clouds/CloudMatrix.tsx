import Link from "next/link";
import { Check } from "lucide-react";
import type { CloudOffer, CloudOverview } from "@/lib/catalog/clouds";
import { cloudHref, labHref, modelHref } from "@/lib/routes";
import { formatReleaseDate } from "@/lib/utils/format";
import { CloudMark, LabMark } from "@/components/ui/BrandMark";
import { Delta } from "@/components/ui/Price";

function Cell({ offer, cloud }: { offer: CloudOffer | null | undefined; cloud: string }) {
  if (!offer) {
    return (
      <span className="text-ink-4">
        <span aria-hidden>-</span>
        <span className="sr-only">Not on {cloud}</span>
      </span>
    );
  }
  const pct = offer.vsLab === null ? null : Math.round(offer.vsLab * 100);
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-[13px]">
      <Check size={15} strokeWidth={2.4} className="flex-none text-ok" aria-hidden />
      <span className="sr-only">On {cloud}:</span>
      {pct === null ? (
        <span className="text-ink-3">listed</span>
      ) : pct === 0 ? (
        <span className="text-ink-2">lab price</span>
      ) : (
        <Delta ratio={offer.vsLab!} />
      )}
    </span>
  );
}

/** The frontier labs' current models, lab by lab, against the clouds: sold there or not, and at what price. */
export function CloudMatrix({ overview }: { overview: CloudOverview }) {
  const clouds = overview.clouds.map((c) => c.cloud);
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Model</th>
            {clouds.map((c) => (
              <th key={c.id} className="text-center">
                <Link href={cloudHref(c.id)} className="inline-flex items-center gap-2 text-ink-2 hover:text-ink hover:underline">
                  <CloudMark id={c.id} name={c.name} size={20} />
                  {c.short}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        {/* One body per lab, headed by the lab: a screen reader names the lab with each of its models. */}
        {overview.rows.map(({ lab, models }) => (
          <tbody key={lab.id}>
            <tr>
              <th colSpan={clouds.length + 1} scope="rowgroup" className="bg-bg pt-4 text-ink-2">
                <Link href={labHref(lab.id)} className="inline-flex items-center gap-2 hover:text-ink hover:underline">
                  <LabMark labId={lab.id} name={lab.name} size={20} />
                  {lab.name}
                </Link>
              </th>
            </tr>
            {models.map(({ model, cells }) => (
              <tr key={model.slug}>
                <th scope="row" className="text-[14px] font-normal">
                  <Link href={modelHref(model)} className="font-medium text-ink hover:text-accent hover:underline">
                    {model.name}
                  </Link>
                  {model.releaseDate && (
                    <span className="ml-2 hidden text-[12.5px] text-ink-3 sm:inline">{formatReleaseDate(model.releaseDate)}</span>
                  )}
                </th>
                {clouds.map((c) => (
                  <td key={c.id} className="text-center">
                    <Cell offer={cells[c.id]} cloud={c.name} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}
