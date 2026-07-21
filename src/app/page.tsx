import Link from "next/link";
import { ArrowUpRight, Settings } from "lucide-react";
import { getDataSource } from "@/lib/data";
import { CAPABILITY_LABELS } from "@/lib/domain/capabilities";
import type { Model } from "@/lib/domain/types";
import { formatCount, formatPrice, formatTokens, relativeFromNow } from "@/lib/utils/format";
import { LandingSearch } from "@/components/landing/LandingSearch";
import { NavSearch } from "@/components/layout/NavSearch";
import { StatusDot } from "@/components/common/StatusDot";
import { ProviderGlyph } from "@/components/common/ProviderGlyph";

function BrandMark() {
  return (
    <span className="grid h-[21px] w-[21px] place-items-center rounded-[5px] border border-border-strong">
      <span className="block h-2 w-2 rotate-45 rounded-[1px] border-[1.5px] border-ink-2" />
    </span>
  );
}

const NAV = [
  { href: "/app/models", label: "Models" },
  { href: "/app/providers", label: "Providers" },
  { href: "/app/capabilities", label: "Capabilities" },
  { href: "/app/pricing", label: "Pricing" },
  { href: "/app/compare", label: "Compare" },
  { href: "/app/api-explorer", label: "API" },
  { href: "/app/playground", label: "Playground" },
];

const RELEASE_WINDOW_DAYS = 15;

// A release is a *model* event, not a listing: the same model is re-listed by every host
// (Azure/Bedrock/Vertex…). Collapse to one card, attributed to the lab that shipped it.
// (Plain function, not a component - so the per-request `Date.now()` read is fine here.)
function pickReleases(models: Model[], providerNameOf: (id: string) => string) {
  const releaseKey = (name: string) =>
    name
      .split("/")
      .pop()!
      .toLowerCase()
      .replace(/@.*$/, "") // claude-fable-5@default
      .replace(/-v\d+:\d+$/, "") // bedrock  …-v1:0
      .replace(/^(?:us|eu|apac|global|ap|ca|sa)\./, "") // region prefix
      .replace(/^(?:openai|anthropic|meta|mistral|mistralai|google|cohere|amazon|ai21|deepseek|writer|stability|luma)\./, "");

  const byNewest = models
    .filter((m) => m.releaseDate)
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));

  const VENDOR_BY_PREFIX: [RegExp, string][] = [
    [/^(gpt|chatgpt|o[1-4]\b|davinci)/, "openai"],
    [/^claude/, "anthropic"],
    [/^(gemini|gemma)/, "google"],
    [/^grok/, "xai"],
    [/^llama/, "meta"],
    [/^(mistral|mixtral|ministral|magistral|codestral|pixtral)/, "mistral"],
    [/^deepseek/, "deepseek"],
    [/^(qwen|qwq)/, "alibaba"],
    [/^command/, "cohere"],
  ];
  const originRank = (m: Model) => {
    const key = releaseKey(m.name);
    const vendor = VENDOR_BY_PREFIX.find(([re]) => re.test(key))?.[1];
    if (!vendor) return 1;
    const provider = providerNameOf(m.providerId).toLowerCase().replace(/[^a-z]/g, "");
    return provider.includes(vendor) ? 0 : 1; // 0 = the lab's own listing
  };

  const canonical = new Map<string, Model>();
  for (const m of byNewest) {
    const key = releaseKey(m.name);
    const held = canonical.get(key);
    if (!held) {
      canonical.set(key, m);
      continue;
    }
    // origin listing wins; otherwise the barest (unprefixed) name wins
    if (originRank(m) < originRank(held) || m.name.length < held.name.length) canonical.set(key, m);
  }
  const deduped = [...canonical.values()].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  const cutoff = Date.now() - RELEASE_WINDOW_DAYS * 86_400_000;
  const recentReleases = deduped.filter((m) => new Date(m.releaseDate).getTime() >= cutoff);
  const fresh = recentReleases.length > 0;
  const featured = (fresh ? recentReleases : deduped).slice(0, 6);

  const freshProviders = [...new Set(featured.map((m) => providerNameOf(m.providerId)))];
  const providerList =
    freshProviders.length <= 3
      ? freshProviders.join(", ")
      : `${freshProviders.slice(0, 3).join(", ")} and ${freshProviders.length - 3} more`;
  const releaseSummary = fresh
    ? `${recentReleases.length} ${recentReleases.length === 1 ? "model" : "models"} released in the last ${RELEASE_WINDOW_DAYS} days - from ${providerList}. Open any to explore its pricing, context and capabilities.`
    : `No releases in the last ${RELEASE_WINDOW_DAYS} days - here are the most recent models added to the index.`;

  return { featured, fresh, releaseSummary };
}

export default async function LandingPage() {
  const ds = getDataSource();
  const [recent, providers, facets] = await Promise.all([
    ds.getModels({ sort: "releaseDesc" }),
    ds.getProviders(),
    ds.getFacets(),
  ]);

  const providerName = new Map(providers.map((p) => [p.id, p.name]));
  const monogram = new Map(providers.map((p) => [p.id, p.monogram]));
  const endpointTotal = providers.reduce((s, p) => s + p.endpoints.length, 0);
  const topProviders = [...facets.providers].slice(0, 8);

  // Latest releases (last 15 days, newest first; honest fallback to most-recent additions).
  const { featured, releaseSummary } = pickReleases(recent, (id) => providerName.get(id) ?? id);

  const openTag = (m: Model): string | null =>
    !m.openness.isOpenWeights
      ? null
      : m.openness.license && /apache|mit|bsd|mpl|gpl|cc0|unlicense/i.test(m.openness.license)
        ? "Open source"
        : "Open weight";

  const stats = [
    { value: formatCount(facets.total), label: "Models" },
    { value: formatCount(providers.length), label: "Providers" },
    { value: formatCount(endpointTotal), label: "Endpoints" },
    { value: formatCount(facets.capabilities.length), label: "Capabilities" },
  ];

  return (
    <div className="min-h-screen">
      {/* marketing nav - one clear doorway into the app */}
      <header className="sticky top-0 z-20 flex h-[52px] items-center border-b border-border bg-bg/80 backdrop-blur-[10px]">
        <div className="mx-auto flex w-full max-w-[1400px] items-center gap-4 px-6">
          <Link href="/" className="flex flex-none items-center gap-[9px]">
            <BrandMark />
            <span className="text-[15px] font-semibold tracking-[-0.02em]">Impulse</span>
          </Link>
          <NavSearch />
          <nav className="ml-auto hidden items-center gap-[2px] md:flex">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="rounded-[7px] px-[11px] py-[7px] text-[15px] text-ink-2 transition-colors hover:text-ink"
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <Link
            href="/app/settings"
            aria-label="Settings"
            className="ml-1 grid h-[32px] w-[32px] flex-none place-items-center rounded-[7px] border border-border text-ink-3 transition-colors hover:border-border-strong hover:text-ink"
          >
            <Settings size={15} />
          </Link>
        </div>
      </header>

      {/* hero */}
      <section className="mx-auto max-w-[1400px] px-6 pb-[26px] pt-[80px]">
        <div className="text-[13px] uppercase tracking-[0.15em] text-ink-4">The AI model index</div>
        <h1 className="mt-4 max-w-[16ch] text-balance text-[clamp(33px,5vw,50px)] font-semibold leading-[1.05] tracking-[-0.035em]">
          The single reference for every AI model.
        </h1>
        <p className="mt-[18px] max-w-[58ch] text-[18px] font-light leading-[1.6] text-ink-2">
          Compare price, context, capabilities and performance across every provider - in one fast,
          keyboard-first workspace built for developers making real decisions.
        </p>

        <div className="mt-[32px]">
          <LandingSearch />
        </div>

        {/* stat strip */}
        <div className="mt-10 grid max-w-[620px] grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-bg px-[18px] py-[16px]">
              <div className="text-[26px] font-medium tracking-[-0.03em]">{s.value}</div>
              <div className="mt-[5px] text-[13px] uppercase tracking-[0.08em] text-ink-4">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* latest releases - clickable cards, each a door straight to the model in the app */}
      <Section
        title="Latest releases"
        href="/app/models"
        linkText="Browse all models →"
      >
        <p className="mb-[18px] -mt-1 max-w-[72ch] text-[15px] leading-[1.6] text-ink-3">
          {releaseSummary}
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-3">
          {featured.map((m) => {
            const tag = openTag(m);
            return (
              <Link
                key={m.id}
                href={`/app/models/${m.id}`}
                className="group flex flex-col rounded-[10px] border border-border bg-panel p-[15px] transition-colors hover:border-border-strong"
              >
                <div className="flex items-center gap-[9px]">
                  <StatusDot status={m.deprecation} />
                  <span className="truncate text-[15px] font-medium">{m.name}</span>
                  <ArrowUpRight
                    size={14}
                    className="ml-auto shrink-0 text-ink-4 transition-colors group-hover:text-ink-2"
                  />
                </div>
                <div className="mt-[3px] text-[13px] text-ink-4">
                  {providerName.get(m.providerId)} · {relativeFromNow(m.releaseDate)}
                </div>
                <p className="mt-[11px] line-clamp-2 text-[14px] leading-[1.55] text-ink-2">
                  {m.description}
                </p>
                <div className="mt-[13px] flex items-center gap-[10px] text-[13px] text-ink-4">
                  {tag && (
                    <span className="rounded-full border border-border-strong px-[8px] py-[2px] text-ink-3">
                      {tag}
                    </span>
                  )}
                  <span className="ml-auto tabular-nums">{formatTokens(m.context.contextWindow)} ctx</span>
                  <span className="tabular-nums">{formatPrice(m.pricing.inputPerMTok)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* capabilities - labeled doors into a filtered view */}
      <Section title="Explore by capability">
        <div className="flex flex-wrap gap-2">
          {facets.capabilities.map((c) => (
            <Link
              key={c.key}
              href={`/app/models?caps=${c.key}`}
              className="inline-flex items-center gap-2 rounded-full border border-border px-[13px] py-[6px] text-[15px] text-ink-2 transition-colors hover:border-border-strong hover:text-ink"
            >
              {CAPABILITY_LABELS[c.key]}
              <span className="text-[13px] text-ink-4">{c.count}</span>
            </Link>
          ))}
        </div>
      </Section>

      {/* providers - static preview, single door */}
      <Section title="Top providers" href="/app/providers" linkText={`All ${providers.length} providers →`}>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-3">
          {topProviders.map((p) => (
            <div key={p.id} className="flex items-center gap-[11px] rounded-[10px] border border-border bg-panel p-[15px]">
              <ProviderGlyph monogram={monogram.get(p.id) ?? "?"} size="md" />
              <div className="min-w-0">
                <div className="truncate text-[14px] font-medium">{p.name}</div>
                <div className="mt-[2px] text-[13px] text-ink-4">{p.count} models</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* footer */}
      <footer className="mt-14 border-t border-border">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-6 pb-11 pt-[26px]">
          <div className="flex items-center gap-[9px]">
            <BrandMark />
            <span className="text-[16px] font-semibold tracking-[-0.02em]">Impulse</span>
          </div>
          <span className="text-[15px] text-ink-4">
            Data updated daily · prices in USD per 1M tokens
          </span>
        </div>
      </footer>
    </div>
  );
}

function Section({
  title,
  href,
  linkText,
  children,
}: {
  title: string;
  href?: string;
  linkText?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-[1400px] px-6 pt-11">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[16px] font-semibold tracking-[-0.01em]">{title}</h2>
        {href && linkText && (
          <Link
            href={href}
            className="text-[15px] text-ink-3 hover:text-ink"
          >
            {linkText}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
