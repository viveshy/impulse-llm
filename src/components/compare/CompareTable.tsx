import Link from "next/link";
import type { ReactNode } from "react";
import { CalendarClock, Check, Minus, X } from "lucide-react";
import { effortsOf, FEATURE_LABEL, MODALITY_LABEL, modalitiesOf } from "@/lib/catalog/capability-view";
import { monthlyCost, PRESETS } from "@/lib/catalog/cost";
import { cheapestListing, isPriceOption } from "@/lib/catalog/group";
import { liveSuccessor, nextRetirement } from "@/lib/catalog/select";
import type { CanonicalModel, CatalogIndex } from "@/lib/catalog/types";
import { bestIndices } from "@/lib/compare";
import { CAPABILITY_GROUPS, CAPABILITY_LABELS } from "@/lib/domain/capabilities";
import { compareHref, labHref, modelHref } from "@/lib/routes";
import { formatDate, formatDaysLeft, formatMoney, formatTokens, formatUsd } from "@/lib/utils/format";
import { clsx } from "@/lib/utils/clsx";
import { KIND_LABEL } from "@/components/models/bits";
import { Badge } from "@/components/ui/Badge";
import { LabMark } from "@/components/ui/BrandMark";
import { PricePair } from "@/components/ui/Price";

const LABEL_CELL =
  "sticky left-0 z-[1] bg-panel text-ink-3 text-[13.5px] whitespace-normal min-w-[120px] max-w-[220px] sm:min-w-[160px]";

// Modalities already have their own rows ("Takes in", "Produces"), so these flags would repeat them.
const MODALITY_CAPS = new Set(["vision", "imageInput", "audio", "video", "imageGeneration", "embeddings"]);
const MODALITY_FEATURES = new Set(["audioInput", "videoInput", "pdfInput", "audioOutput", "promptCaching"]);

const tokens = (n: number) => (n < 1000 ? String(n) : `${n / 1000}K`);

function Section({ title, note, span }: { title: string; note?: string; span: number }) {
  return (
    <tr>
      <th colSpan={span} scope="colgroup" className="!whitespace-normal !bg-sunken !py-[8px] text-[13px] !text-ink-2">
        {/* Stays in view while the table scrolls sideways, and wraps inside the screen on phones. */}
        <span className="sticky left-[14px] inline-block max-w-[calc(100vw-72px)] sm:max-w-none">
          {title}
          {note && <span className="font-normal text-ink-3"> · {note}</span>}
        </span>
      </th>
    </tr>
  );
}

function Row<T>({
  label,
  sub,
  items,
  cell,
}: {
  label: ReactNode;
  sub?: ReactNode;
  items: T[];
  cell: (item: T, i: number) => ReactNode;
}) {
  return (
    <tr>
      <th scope="row" className={LABEL_CELL}>
        <span className="font-medium text-ink-2">{label}</span>
        {sub && <div className="text-[12.5px] font-normal text-ink-3">{sub}</div>}
      </th>
      {items.map((item, i) => (
        <td key={i} className="wrap align-top">
          {cell(item, i)}
        </td>
      ))}
    </tr>
  );
}

const Dash = ({ children = "-" }: { children?: ReactNode }) => <span className="text-ink-4">{children}</span>;

/** A number row with the best value marked by weight and a check, never by colour alone. */
function NumberRow({
  label,
  sub,
  values,
  better,
  show,
}: {
  label: ReactNode;
  sub?: ReactNode;
  values: (number | null | undefined)[];
  better: "low" | "high";
  show: (v: number) => ReactNode;
}) {
  const best = bestIndices(values, better);
  return (
    <Row
      label={label}
      sub={sub}
      items={values}
      cell={(v, i) =>
        v === null || v === undefined ? (
          <Dash />
        ) : (
          <span className={clsx("inline-flex items-center gap-1", best.has(i) ? "font-semibold text-ink" : "text-ink-2")}>
            {show(v)}
            {best.has(i) && <Check size={14} className="text-ok" aria-label={better === "low" ? "lowest" : "highest"} />}
          </span>
        )
      }
    />
  );
}

const Yes = () => <Check size={16} className="text-ok" aria-label="Yes" />;
const No = () => <Minus size={16} className="text-ink-4" aria-label="No" />;

function StatusCell({ m, today, index }: { m: CanonicalModel; today: string; index: CatalogIndex }) {
  const next = nextRetirement(m, today);
  const successor = liveSuccessor(m, index);
  return (
    <div className="space-y-1">
      {m.preview ? <Badge tone="warn">Preview</Badge> : m.isCurrent ? <Badge tone="ok">Current</Badge> : <Badge>Older</Badge>}
      {next && next.daysLeft <= 180 && (
        <div className="text-[13px] text-ink-2">
          <Badge tone={next.daysLeft <= 30 ? "err" : next.daysLeft <= 90 ? "warn" : "neutral"} icon={<CalendarClock size={12} />}>
            {formatDaysLeft(next.daysLeft)}
          </Badge>{" "}
          Leaves {next.hosts.join(", ")} on {formatDate(next.date)}
        </div>
      )}
      {successor && (
        <div className="text-[13px] text-ink-3">
          Newer:{" "}
          <Link href={modelHref(successor)} className="text-ink-2 hover:text-accent hover:underline">
            {successor.name}
          </Link>
        </div>
      )}
    </div>
  );
}

export function CompareTable({ models, index }: { models: CanonicalModel[]; index: CatalogIndex }) {
  const span = models.length + 1;
  const priced = models.map((m) => (isPriceOption(m.reference) ? m.reference.pricing : null));
  const cheapest = models.map((m) => cheapestListing(m));
  const ios = models.map(modalitiesOf);
  const capKeys = CAPABILITY_GROUPS.flatMap((g) => g.keys).filter(
    (k) => !MODALITY_CAPS.has(k) && models.some((m) => m.capabilities.includes(k)),
  );
  const features = [...new Set(models.flatMap((m) => m.features))].filter((f) => !MODALITY_FEATURES.has(f)).sort((a, b) =>
    (FEATURE_LABEL[a] ?? a).localeCompare(FEATURE_LABEL[b] ?? b),
  );
  const longCtx = priced.some((p) => p?.longContext);

  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <colgroup>
          <col className="w-[132px] sm:w-[200px]" />
          {models.map((m) => (
            <col key={m.slug} className="min-w-[200px]" />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th className={LABEL_CELL}>
              <span className="sr-only">Model</span>
            </th>
            {models.map((m, i) => (
              <th key={m.slug} scope="col" className="!whitespace-normal align-top !text-[15px] !text-ink">
                <div className="flex items-start gap-2">
                  <LabMark labId={m.labId} name={m.labName} size={28} />
                  <div className="min-w-0 flex-1">
                    <Link href={modelHref(m)} className="font-semibold hover:text-accent hover:underline">
                      {m.name}
                    </Link>
                    <div className="text-[12.5px] font-normal text-ink-3">
                      <Link href={labHref(m.labSlug)} className="hover:text-ink">
                        {m.labName}
                      </Link>
                      {m.kind !== "chat" ? ` · ${KIND_LABEL[m.kind]}` : ""}
                    </div>
                  </div>
                  <Link
                    href={compareHref(models.filter((_, j) => j !== i))}
                    aria-label={`Remove ${m.name}`}
                    title="Remove"
                    className="grid h-7 w-7 flex-none place-items-center rounded-[7px] text-ink-3 hover:bg-hover hover:text-ink"
                  >
                    <X size={15} />
                  </Link>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <Section title="Overview" span={span} />
          <Row label="Released" items={models} cell={(m) => (m.releaseDate ? formatDate(m.releaseDate) : <Dash />)} />
          <Row label="Status" items={models} cell={(m) => <StatusCell m={m} today={index.today} index={index} />} />
          <Row
            label="Open weights"
            items={models}
            cell={(m) => {
              const lic = m.listings.find((l) => l.license)?.license;
              return m.openWeights ? `Yes${lic ? `, ${lic}` : ""}` : <span className="text-ink-3">No</span>;
            }}
          />
          <NumberRow label="Hosts" sub="APIs you can call it on" values={models.map((m) => m.hostCount)} better="high" show={(v) => v} />

          <Section title="Price" note="USD per million tokens, at the lab's own API where it sells the model" span={span} />
          <Row
            label="Priced at"
            items={models}
            cell={(m) => (isPriceOption(m.reference) ? m.reference.host.name : <Dash>Not listed</Dash>)}
          />
          <NumberRow label="Input" values={priced.map((p) => p?.inputPerMTok)} better="low" show={formatUsd} />
          <NumberRow label="Output" values={priced.map((p) => p?.outputPerMTok)} better="low" show={formatUsd} />
          <NumberRow label="Cached input" values={priced.map((p) => p?.cachedInputPerMTok)} better="low" show={formatUsd} />
          <Row
            label="Batch"
            sub="input / output"
            items={priced}
            cell={(p) =>
              p?.batchInputPerMTok !== undefined ? (
                <PricePair input={p.batchInputPerMTok} output={p.batchOutputPerMTok} />
              ) : (
                <Dash />
              )
            }
          />
          {longCtx && (
            <Row
              label="Long prompts"
              sub="input / output"
              items={priced}
              cell={(p) =>
                p?.longContext ? (
                  <>
                    <PricePair input={p.longContext.inputPerMTok} output={p.longContext.outputPerMTok} />
                    <div className="text-[12.5px] text-ink-3">above {formatTokens(p.longContext.thresholdTokens)}</div>
                  </>
                ) : (
                  <Dash />
                )
              }
            />
          )}
          <Row
            label="Cheapest anywhere"
            sub="input / output"
            items={cheapest}
            cell={(l) =>
              l ? (
                <>
                  <PricePair input={l.pricing.inputPerMTok} output={l.pricing.outputPerMTok} />
                  <div className="text-[12.5px] text-ink-3">{l.host.name}</div>
                </>
              ) : (
                <Dash>Not listed</Dash>
              )
            }
          />

          <Section title="Monthly bill" note="at the price above, 30 days, with each workload's cache and batch use" span={span} />
          {PRESETS.map((p) => (
            <NumberRow
              key={p.id}
              label={p.label}
              sub={`${p.workload.requestsPerDay.toLocaleString("en-US")} a day, ${tokens(p.workload.inputTokens)} in, ${tokens(p.workload.outputTokens)} out`}
              values={priced.map((pr) => (pr ? (monthlyCost(pr, p.workload)?.total ?? null) : null))}
              better="low"
              show={formatMoney}
            />
          ))}

          <Section title="Limits" span={span} />
          <NumberRow
            label="Context window"
            values={models.map((m) => m.contextWindow || null)}
            better="high"
            show={(v) => `${formatTokens(v)} tokens`}
          />
          <NumberRow
            label="Max output"
            values={models.map((m) => m.maxOutputTokens || null)}
            better="high"
            show={(v) => `${formatTokens(v)} tokens`}
          />

          <Section title="Capabilities" span={span} />
          <Row label="Takes in" items={ios} cell={(io) => io.input.map((x) => MODALITY_LABEL[x] ?? x).join(", ")} />
          <Row label="Produces" items={ios} cell={(io) => io.output.map((x) => MODALITY_LABEL[x] ?? x).join(", ")} />
          <Row
            label="Effort settings"
            sub="as listed by the source"
            items={models}
            cell={(m) => {
              const e = effortsOf(m);
              return e.length ? e.join(", ") : <Dash />;
            }}
          />
          {capKeys.map((k) => (
            <Row
              key={k}
              label={CAPABILITY_LABELS[k]}
              items={models}
              cell={(m) => (m.capabilities.includes(k) ? <Yes /> : <No />)}
            />
          ))}
          {features.map((f) => (
            <Row key={f} label={FEATURE_LABEL[f] ?? f} items={models} cell={(m) => (m.features.includes(f) ? <Yes /> : <No />)} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
