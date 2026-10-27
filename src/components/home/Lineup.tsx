import Link from "next/link";
import type { Lab } from "@/lib/catalog/labs";
import type { CanonicalModel } from "@/lib/catalog/types";
import { labHref, modelHref } from "@/lib/routes";
import { formatReleaseDate, formatTokens } from "@/lib/utils/format";
import { LabMark } from "@/components/ui/BrandMark";
import { PricePair } from "@/components/ui/Price";

export function Lineup({ groups }: { groups: { lab: Lab; models: CanonicalModel[] }[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {groups.map(({ lab, models }) => (
        <div key={lab.id} className="flex min-w-0 flex-col rounded-[12px] border border-border bg-panel shadow-[var(--shadow)]">
          <Link
            href={labHref(lab.id)}
            className="flex items-center gap-[10px] border-b border-border-2 px-4 py-3 hover:bg-hover"
          >
            <LabMark labId={lab.id} name={lab.name} size={26} />
            <span className="font-semibold tracking-[-0.01em] text-ink">{lab.name}</span>
            <span className="ml-auto text-[13px] text-ink-3">All models</span>
          </Link>
          <ul className="flex-1 divide-y divide-border-2">
            {models.map((m) => (
              <li key={m.slug}>
                <Link href={modelHref(m)} className="group block px-4 py-3 hover:bg-hover">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium text-ink group-hover:text-accent">{m.name}</span>
                    <span className="whitespace-nowrap text-[12.5px] text-ink-3">
                      {m.releaseDate ? formatReleaseDate(m.releaseDate) : ""}
                    </span>
                  </div>
                  <div className="mt-[2px] flex items-baseline justify-between gap-3 text-[13px] text-ink-3">
                    <PricePair input={m.reference.pricing.inputPerMTok} output={m.reference.pricing.outputPerMTok} />
                    <span className="whitespace-nowrap">{formatTokens(m.contextWindow)} ctx</span>
                  </div>
                </Link>
              </li>
            ))}
            {!models.length && <li className="px-4 py-3 text-[13.5px] text-ink-3">No current models listed.</li>}
          </ul>
        </div>
      ))}
    </div>
  );
}
