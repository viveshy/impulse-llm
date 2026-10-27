import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Square, SquareCheck } from "lucide-react";
import { NOTICE_PAGES, NOTICES_CHECKED } from "@/lib/catalog/notices";
import { retiring, type RetiringItem, type TierFilter } from "@/lib/catalog/select";
import { getCatalogIndex } from "@/lib/data/catalog-index";
import { labHref, modelHref } from "@/lib/routes";
import { formatDate, formatDaysLeft } from "@/lib/utils/format";
import { RetirementHosts, urgency } from "@/components/home/RetiringList";
import { KIND_LABEL } from "@/components/models/bits";
import { Container } from "@/components/site/Container";
import { Badge } from "@/components/ui/Badge";
import { Delta, PricePair } from "@/components/ui/Price";
import { ParamChips } from "@/components/ui/TierTabs";

export const metadata: Metadata = {
  title: "Retiring models",
  description:
    "Which AI models the labs and clouds are retiring, when, where, and which newer model to move to.",
  alternates: { canonical: "/retiring" },
};

const TIERS: { id: TierFilter; label: string }[] = [
  { id: "frontier", label: "Frontier labs" },
  { id: "all", label: "All labs" },
];

/** The successor's headline price, and how it compares with the model being retired. */
function SuccessorPrice({ item }: { item: RetiringItem }) {
  const next = item.successor!.reference;
  const now = item.model.reference.blended;
  return (
    <>
      <PricePair input={next.pricing.inputPerMTok} output={next.pricing.outputPerMTok} />
      {now && next.blended ? (
        <div className="text-[12.5px] text-ink-3">
          <Delta ratio={next.blended / now - 1} /> vs today
        </div>
      ) : null}
    </>
  );
}

function Table({ items }: { items: RetiringItem[] }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Date</th>
            <th>Model</th>
            <th className="hidden sm:table-cell">Where</th>
            <th className="hidden sm:table-cell">Move to</th>
            <th className="num hidden sm:table-cell">Its price, in / out per 1M</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.model.slug}>
              <td>
                <div className="text-ink">{formatDate(it.date)}</div>
                <Badge tone={urgency(it.daysLeft)} icon={<CalendarClock size={12} />} className="mt-1">
                  {formatDaysLeft(it.daysLeft)}
                </Badge>
              </td>
              <td className="wrap sm:whitespace-nowrap">
                <Link href={modelHref(it.model)} className="font-medium text-ink hover:text-accent hover:underline">
                  {it.model.name}
                </Link>
                <div className="text-[13px] text-ink-3">
                  <Link href={labHref(it.model.labSlug)} className="hover:text-ink">
                    {it.model.labName}
                  </Link>
                  {it.model.kind !== "chat" ? ` · ${KIND_LABEL[it.model.kind]}` : ""}
                </div>
                <div className="mt-1 space-y-[2px] text-[13px] text-ink-2 sm:hidden">
                  <RetirementHosts item={it} />
                  {it.successor && (
                    <div>
                      Move to{" "}
                      <Link href={modelHref(it.successor)} className="hover:text-accent hover:underline">
                        {it.successor.name}
                      </Link>
                    </div>
                  )}
                </div>
              </td>
              <td className="wrap hidden max-w-[320px] text-ink-2 sm:table-cell">
                <RetirementHosts item={it} />
              </td>
              <td className="hidden sm:table-cell">
                {it.successor ? (
                  <Link href={modelHref(it.successor)} className="text-ink-2 hover:text-accent hover:underline">
                    {it.successor.name}
                  </Link>
                ) : (
                  <span className="text-ink-3">-</span>
                )}
              </td>
              <td className="num hidden sm:table-cell">{it.successor ? <SuccessorPrice item={it} /> : ""}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function RetiringPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [index, sp] = await Promise.all([getCatalogIndex(), searchParams]);
  const tier = TIERS.find((t) => t.id === sp.tier)?.id ?? "frontier";
  const plans = sp.plans === "1";
  const upcoming = retiring(index, { fromDays: 0, toDays: 365, tier, apiOnly: !plans });
  const recent = retiring(index, { fromDays: -60, toDays: -1, tier, apiOnly: !plans }).reverse();
  const within30 = upcoming.filter((i) => i.daysLeft <= 30).length;

  return (
    <Container className="py-10">
      <h1 className="text-[30px] font-semibold tracking-[-0.03em]">Retiring models</h1>
      <p className="mt-1 max-w-[70ch] text-[15px] text-ink-3">
        {upcoming.length} models have a retirement scheduled on at least one API in the next 12 months, {within30} of them
        within 30 days. Check the host&rsquo;s own notice before you plan a move: the links are{" "}
        <a href="#about" className="text-accent hover:underline">
          at the bottom
        </a>
        .
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <ParamChips base="/retiring" param="tier" value={tier} options={TIERS} extra={{ plans: plans ? "1" : undefined }} />
        <Link
          href={`/retiring?${new URLSearchParams({ ...(tier !== "frontier" ? { tier } : {}), ...(plans ? {} : { plans: "1" }) })}`}
          className="inline-flex items-center gap-2 text-[14px] text-ink-2 hover:text-ink"
        >
          {plans ? (
            <SquareCheck size={16} className="flex-none text-accent" aria-hidden />
          ) : (
            <Square size={16} className="flex-none text-ink-3" aria-hidden />
          )}
          Include subscription plans (Copilot, ChatGPT)
          <span className="sr-only">{plans ? ", on" : ", off"}</span>
        </Link>
      </div>
      <h2 className="mb-3 mt-8 text-[18px] font-semibold tracking-[-0.02em]">Coming up</h2>
      {upcoming.length ? <Table items={upcoming} /> : <p className="text-ink-3">Nothing scheduled.</p>}
      {recent.length > 0 && (
        <>
          <h2 className="mb-3 mt-10 text-[18px] font-semibold tracking-[-0.02em]">Retired in the last 60 days</h2>
          <Table items={recent} />
        </>
      )}
      <section id="about" className="mt-12 max-w-[75ch] scroll-mt-20 space-y-3 text-[14px] leading-[1.6] text-ink-3">
        <h2 className="text-[16px] font-semibold text-ink-2">About these dates</h2>
        <p>
          Dates come from LiteLLM&rsquo;s open model price list, which tracks the hosts&rsquo; notices. On{" "}
          {formatDate(NOTICES_CHECKED)} we checked the notices of OpenAI, Anthropic, Google, Microsoft and Amazon by hand
          and corrected the dates that differed.
        </p>
        <p>
          Some hosts only promise a model until a date (&ldquo;not sooner than&rdquo;, &ldquo;or later&rdquo;). That is the
          earliest it can go, not a shutdown, so it is left off this page and shown on the model&rsquo;s own page.
        </p>
        <p>
          A host with a version or region in brackets retires only that part, or everything but that part, and keeps
          serving the rest. Fine-tuned models follow their own schedules and aren&rsquo;t listed.
        </p>
        <p>
          &ldquo;Move to&rdquo; is the newest model in the same line, shown only when no API drops it within three months
          of that date.
        </p>
        <p>
          The hosts&rsquo; own notices:{" "}
          {NOTICE_PAGES.map((n, i) => (
            <span key={n.url}>
              {i > 0 && " · "}
              <a href={n.url} className="text-accent hover:underline">
                {n.name}
              </a>
            </span>
          ))}
        </p>
      </section>
    </Container>
  );
}
