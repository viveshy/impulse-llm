import Link from "next/link";
import type { CanonicalModel } from "@/lib/catalog/types";
import { modelHref } from "@/lib/routes";
import { formatReleaseDate } from "@/lib/utils/format";
import { Badge } from "@/components/ui/Badge";
import { PricePair } from "@/components/ui/Price";

/** The model's line, newest first: the head, this model, and what came before. */
export function Lineage({ model, line }: { model: CanonicalModel; line: CanonicalModel[] }) {
  return (
    <ol className="divide-y divide-border-2 rounded-[12px] border border-border bg-panel shadow-[var(--shadow)]">
      {line.map((m) => {
        const self = m.slug === model.slug;
        return (
          <li key={m.slug} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
            <span className="w-[76px] flex-none text-[13px] text-ink-3">
              {m.releaseDate ? formatReleaseDate(m.releaseDate) : "Undated"}
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-2">
              {self ? (
                <span className="font-semibold text-ink">{m.name}</span>
              ) : (
                <Link href={modelHref(m)} className="font-medium text-ink hover:text-accent hover:underline">
                  {m.name}
                </Link>
              )}
              {m.isCurrent && <Badge tone="accent">Latest</Badge>}
              {self && !m.isCurrent && <Badge>This page</Badge>}
            </span>
            <span className="text-[13.5px]">
              <PricePair input={m.reference.pricing.inputPerMTok} output={m.reference.pricing.outputPerMTok} />
            </span>
          </li>
        );
      })}
    </ol>
  );
}
