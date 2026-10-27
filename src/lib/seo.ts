/**
 * What search engines and AI answer engines read: the pages in the sitemap, llms.txt, and each
 * model's short answers and structured data. All of it comes from the catalog, like the pages.
 */
import { findAlternatives } from "@/lib/catalog/alternatives";
import { hostLabel, hostRows } from "@/lib/catalog/detail";
import { cheapestListing, isLive, isPriceOption } from "@/lib/catalog/group";
import type { HostKind } from "@/lib/catalog/hosts";
import { LABS, labById } from "@/lib/catalog/labs";
import { NOTICES_CHECKED } from "@/lib/catalog/notices";
import {
  byNewest,
  frontierLineup,
  hostRetirements,
  liveSuccessor,
  retirementLabel,
  retiring,
  type HostRetirement,
} from "@/lib/catalog/select";
import type { CanonicalModel, CatalogIndex, Listing } from "@/lib/catalog/types";
import { CLOUDS } from "@/lib/clouds";
import { cloudHref, compareHref, hostHref, labHref, labsOf, modelHref, SITE_URL } from "@/lib/routes";
import { formatDate, formatTokens, formatUsd } from "@/lib/utils/format";

export const SITE_DESCRIPTION =
  "Every frontier AI model with its price on every host, new releases, retirements, cheaper alternatives and a cost calculator.";

const site = (path: string) => `${SITE_URL}${path}`;

const NOT_A_HOST: HostKind[] = ["subscription", "local"];

/** "A", "A and B", "A, B and C". */
const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);

/** The APIs that serve the model, its lab's own first; plans and local runtimes aren't APIs. */
const apiHosts = (m: CanonicalModel) =>
  hostRows(m)
    .map((r) => r.listing.host)
    .filter((h) => !NOT_A_HOST.includes(h.kind))
    .map((h) => h.name);

/** "A, B, C and 4 more" past `limit` names. */
const someOf = (names: string[], limit: number) =>
  and(names.length > limit ? [...names.slice(0, limit - 1), `${names.length - limit + 1} more`] : names);

// --- Sitemap ---

export interface SitemapPage {
  path: string;
  priority: number;
}

const INDEX_PAGES = ["/models", "/releases", "/retiring", "/clouds", "/compare", "/calculator", "/labs", "/hosts", "/watchlist"];

/** Every page worth a crawler's visit: the index pages, then each cloud, model, lab and host. Alias-only models repeat another page. */
export function sitemapPages(index: CatalogIndex): SitemapPage[] {
  return [
    { path: "/", priority: 1 },
    ...INDEX_PAGES.map((path) => ({ path, priority: 0.8 })),
    ...CLOUDS.map((c) => ({ path: cloudHref(c.id), priority: 0.7 })),
    ...index.models
      .filter((m) => !m.aliasOnly)
      .map((m) => ({ path: modelHref(m), priority: m.tier === "frontier" ? 0.7 : 0.5 })),
    ...[...labsOf(index)].sort().map((slug) => ({ path: labHref(slug), priority: 0.6 })),
    ...index.hosts.map((h) => ({ path: hostHref(h.slug), priority: 0.5 })),
  ];
}

// --- A model's short answers ---

export interface Answer {
  q: string;
  a: string;
}

/** "$4.00 per million input tokens and $20.00 per million output tokens"; a price of 0 means none is listed. */
function perToken(l: Listing): string {
  const { inputPerMTok: input, outputPerMTok: output } = l.pricing;
  return and([
    ...(input > 0 ? [`${formatUsd(input)} per million input tokens`] : []),
    ...(output ? [`${formatUsd(output)} per million output tokens`] : []),
  ]);
}

const pct = (saving: number) => `${Math.round(saving * 100)}%`;

/** The model's own price, and a cheaper offer when it saves 1% or more: less is a rounding difference, not a saving. */
function offers(m: CanonicalModel): { own?: Listing; lower?: Listing } {
  const own = isPriceOption(m.reference) ? m.reference : undefined;
  const cheapest = cheapestListing(m);
  return { own, lower: cheapest && (!own || cheapest.blended! <= own.blended! * 0.99) ? cheapest : undefined };
}

function priceAnswer(m: CanonicalModel): string | null {
  const { own, lower } = offers(m);
  if (!own) return lower ? `Its lowest listed price is at ${hostLabel(lower)}: ${perToken(lower)}.` : null;
  const cached = own.pricing.cachedInputPerMTok;
  return [
    `On ${own.host.name}, ${m.name} costs ${perToken(own)}.`,
    cached ? `Cached input costs ${formatUsd(cached)} per million tokens.` : "",
    lower ? `The cheapest host is ${hostLabel(lower)}, at ${perToken(lower)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** "OpenAI retires it on 11 Dec 2026; Azure OpenAI on 9 Feb 2027", up to four dates. */
function retirementDates(rs: HostRetirement[]): string {
  const byDate = new Map<string, string[]>();
  for (const r of rs) byDate.set(r.date, [...(byDate.get(r.date) ?? []), retirementLabel(r)]);
  return [...byDate]
    .slice(0, 4)
    .map(([date, hosts], i) =>
      i === 0
        ? `${and(hosts)} ${hosts.length > 1 ? "retire" : "retires"} it on ${formatDate(date)}`
        : `${and(hosts)} on ${formatDate(date)}`,
    )
    .join("; ");
}

function retirementAnswer(m: CanonicalModel, today: string): string {
  const all = hostRetirements(m, { apiOnly: true });
  const coming = all.filter((r) => r.date >= today);
  if (coming.length) {
    const dropped = new Set(coming.filter((r) => !r.only && !r.except).map((r) => r.host));
    const staying = m.hostCount - dropped.size;
    return `${retirementDates(coming)}. ${
      staying > 0 ? `${staying} ${staying === 1 ? "host keeps" : "hosts keep"} serving it.` : "No API serves it after that."
    }`;
  }
  if (!m.listings.some((l) => isLive(l, today))) {
    const last = all.at(-1);
    return last ? `It has been retired: ${retirementLabel(last)} retired it on ${formatDate(last.date)}.` : "It has been retired.";
  }
  return "No retirement date is scheduled for it on any API we track.";
}

function newerAnswer(m: CanonicalModel, index: CatalogIndex): string | null {
  const next = liveSuccessor(m, index);
  if (next)
    return `Yes. ${next.name} is the newest model in this line${next.releaseDate ? `, released on ${formatDate(next.releaseDate)}` : ""}.`;
  return m.isCurrent && m.predecessorSlugs.length ? `No. ${m.name} is the newest model in its line.` : null;
}

function alternativesAnswer(m: CanonicalModel, index: CatalogIndex): string | null {
  const alt = findAlternatives(m, index);
  if (!alt.priced) return null;
  const picks = [...alt.sameLab.slice(0, 1), ...alt.frontier.slice(0, 2), ...alt.openWeight.slice(0, 1)];
  const where = alt.cheaperHosts[0];
  if (!picks.length && !where) return null;
  return [
    picks.length
      ? `Models that cost less and keep most of what it can do: ${and(
          picks.map((a) => `${a.model.name} on ${a.listing.host.name} (${pct(a.saving!)} less)`),
        )}.`
      : "",
    where ? `${m.name} itself costs ${pct(where.saving!)} less on ${hostLabel(where.listing)}.` : "",
    m.reference.pricing.outputPerMTok ? "Savings are on a mix of 3 input tokens to 1 output token." : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function idAnswer(m: CanonicalModel): string {
  const ref = m.reference;
  const others = hostRows(m)
    .map((r) => r.listing)
    .filter((l) => l.hostId !== ref.hostId && l.apiModelId !== ref.apiModelId && !NOT_A_HOST.includes(l.host.kind))
    .slice(0, 4);
  return [
    `Use ${ref.apiModelId} with ${ref.host.name}.`,
    others.length ? `Other hosts use their own ids: ${others.map((l) => `${l.apiModelId} on ${l.host.name}`).join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Short questions people ask about a model, answered from the catalog; one it can't answer is left out. */
export function modelAnswers(m: CanonicalModel, index: CatalogIndex): Answer[] {
  const hosts = apiHosts(m);
  const out: (Answer | null)[] = [
    ((a) => (a ? { q: `How much does ${m.name} cost?`, a } : null))(priceAnswer(m)),
    hosts.length
      ? { q: `Which APIs offer ${m.name}?`, a: `${m.name} runs on ${hosts.length} ${hosts.length === 1 ? "API" : "APIs"}: ${someOf(hosts, 10)}.` }
      : null,
    m.contextWindow
      ? {
          q: `What is ${m.name}'s context window?`,
          a: `${formatTokens(m.contextWindow)} tokens${m.maxOutputTokens ? `, with up to ${formatTokens(m.maxOutputTokens)} tokens in one reply` : ""}.`,
        }
      : null,
    hosts.length ? { q: `Is ${m.name} being retired?`, a: retirementAnswer(m, index.today) } : null,
    ((a) => (a ? { q: `Is there a newer version of ${m.name}?`, a } : null))(newerAnswer(m, index)),
    ((a) => (a ? { q: `What are cheaper alternatives to ${m.name}?`, a } : null))(alternativesAnswer(m, index)),
    m.releaseDate ? { q: `When was ${m.name} released?`, a: `${m.labName} released it on ${formatDate(m.releaseDate)}.` } : null,
    { q: `What is ${m.name}'s API model id?`, a: idAnswer(m) },
  ];
  return out.filter((x): x is Answer => !!x);
}

// --- Structured data ---

/** JSON for a script tag: `<` is escaped, so no value can close the tag. */
export function jsonLdString(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

type Crumb = [name: string, path: string];

const breadcrumbs = (crumbs: Crumb[]) => ({
  "@type": "BreadcrumbList",
  itemListElement: crumbs.map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: site(path) })),
});

const WEBSITE_ID = `${SITE_URL}/#website`;

/** The site itself, with its model search; for the home page. */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_URL}/`,
    name: "Impulse",
    description: SITE_DESCRIPTION,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/models?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** A page and the trail to it; the last crumb is the page. */
export function pageJsonLd(name: string, crumbs: Crumb[]) {
  const url = site(crumbs.at(-1)![1]);
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": url,
    url,
    name,
    isPartOf: { "@id": WEBSITE_ID },
    breadcrumb: breadcrumbs(crumbs),
  };
}

const unitPrice = (price: number, unitText: string) => ({
  "@type": "UnitPriceSpecification",
  price,
  priceCurrency: "USD",
  referenceQuantity: { "@type": "QuantitativeValue", value: 1_000_000, unitText },
});

/** The model page: its trail, the model as a service each host sells at its own price, and its short answers. */
export function modelJsonLd(m: CanonicalModel, answers: Answer[], generatedAt?: string) {
  const url = site(modelHref(m));
  const website = labById(m.labId)?.website;
  const offers = hostRows(m)
    .map((r) => r.listing)
    .filter(isPriceOption)
    .slice(0, 12)
    .map((l) => ({
      "@type": "Offer",
      seller: { "@type": "Organization", name: l.host.name },
      priceCurrency: "USD",
      priceSpecification: [
        ...(l.pricing.inputPerMTok > 0 ? [unitPrice(l.pricing.inputPerMTok, "input tokens")] : []),
        ...(l.pricing.outputPerMTok ? [unitPrice(l.pricing.outputPerMTok, "output tokens")] : []),
      ],
    }));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": url,
        url,
        name: `${m.name} pricing, hosts and alternatives`,
        isPartOf: { "@id": WEBSITE_ID },
        about: { "@id": `${url}#model` },
        ...(generatedAt ? { dateModified: generatedAt } : {}),
        breadcrumb: breadcrumbs([
          ["Models", "/models"],
          [m.labName, labHref(m.labSlug)],
          [m.name, modelHref(m)],
        ]),
      },
      {
        "@type": "Service",
        "@id": `${url}#model`,
        name: m.name,
        serviceType: m.kind === "chat" ? "AI language model API" : `AI ${m.kind} model API`,
        ...(m.description ? { description: m.description } : {}),
        provider: { "@type": "Organization", name: m.labName, ...(website ? { url: website } : {}) },
        ...(offers.length ? { offers } : {}),
      },
      ...(answers.length
        ? [
            {
              "@type": "FAQPage",
              mainEntity: answers.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
            },
          ]
        : []),
    ],
  };
}

// --- llms.txt ---

const SUMMARY =
  "Prices, hosts, releases and retirements of AI models. For each model: what it costs on every API that serves it (the lab's own, AWS, Azure, Google Cloud, inference providers and gateways), its context window and capabilities, cheaper alternatives, and when each host retires it.";

function about(index: CatalogIndex): string {
  const models = index.models.filter((m) => !m.aliasOnly);
  const labs = new Set(models.map((m) => m.labId).filter(Boolean)).size;
  const asOf = formatDate((index.generatedAt ?? index.today).slice(0, 10));
  return [
    "Prices are list prices in US dollars per million tokens.",
    "The catalog is rebuilt every 6 hours from LiteLLM's open model price list and the hosts' own pages;",
    `on ${formatDate(NOTICES_CHECKED)} the retirement dates of OpenAI, Anthropic, Google, Microsoft and Amazon were checked by hand against their notices.`,
    `As of ${asOf} it holds ${models.length} models from ${labs} labs on ${index.hosts.length} hosts.`,
  ].join(" ");
}

const usd = (v: number) => (v > 0 ? formatUsd(v) : "-");

/** "$4.00 in / $20.00 out per 1M tokens", or "$0.02 per 1M input tokens" when nothing comes out. */
const price = (l: Listing) =>
  l.pricing.outputPerMTok
    ? `${usd(l.pricing.inputPerMTok)} in / ${formatUsd(l.pricing.outputPerMTok)} out per 1M tokens`
    : `${usd(l.pricing.inputPerMTok)} per 1M input tokens`;

function modelLine(m: CanonicalModel): string {
  const { own: ref, lower } = offers(m);
  const hosts = apiHosts(m);
  const facts = [
    m.labName,
    m.kind !== "chat" ? `${m.kind} model` : "",
    m.openWeights ? "open weights" : "",
    m.releaseDate ? `released ${formatDate(m.releaseDate)}` : "",
    ref ? `${price(ref)} at ${ref.host.name}` : "",
    lower ? `${ref ? "from " : ""}${price(lower)} at ${hostLabel(lower)}` : "",
    m.contextWindow ? `${formatTokens(m.contextWindow)} context` : "",
    hosts.length ? `on ${someOf(hosts, 6)}` : "",
  ];
  return `- [${m.name}](${site(modelHref(m))}): ${facts.filter(Boolean).join(", ")}`;
}

/** The site in brief for language models, after llmstxt.org: what it is, its pages and the frontier lineup. */
export function llmsTxt(index: CatalogIndex): string {
  const lineup = frontierLineup(index, 3).filter((g) => g.models.length);
  const pair = lineup.map((g) => g.models[0]).slice(0, 2);
  return [
    "# Impulse",
    "",
    `> ${SUMMARY}`,
    "",
    about(index),
    "",
    "## Pages",
    "",
    `- [Full catalog as text](${site("/llms-full.txt")}): every current model with its price, context window and hosts, and every retirement in the next 12 months`,
    `- [Models](${site("/models")}): every model with its price, context window, capabilities and hosts; search with ${site("/models?q=")}<name>`,
    `- [Releases](${site("/releases")}): new models, month by month`,
    `- [Retiring models](${site("/retiring")}): retirements in the next 12 months, by host, with the model to move to`,
    `- [Clouds](${site("/clouds")}): which frontier models AWS, Azure and Google Cloud sell, at what price against the lab's own API`,
    `- [Compare](${site("/compare")}): models side by side${pair.length === 2 ? `, for example ${site(compareHref(pair))}` : ""}`,
    `- [Cost calculator](${site("/calculator")}): what a month of traffic costs on every frontier model`,
    `- [Labs](${site("/labs")}) and [hosts](${site("/hosts")}): every lab's models, and every API that serves them`,
    `- [Watchlist](${site("/watchlist")}): calendar and RSS alerts for the models a team runs`,
    "",
    `Each model has a page at ${site("/models/<lab>/<model>")} with its price on every host, capabilities, cheaper alternatives, retirement dates and code to call it.`,
    "",
    "## Frontier models",
    "",
    ...lineup.flatMap((g) => g.models.map(modelLine)),
    "",
    "## Optional",
    "",
    `- [Releases feed](${site("/releases/feed.xml")}): RSS of new models`,
    "",
  ].join("\n");
}

const TIER_ORDER = ["frontier", "open", "other"];
const labOrder = (m: CanonicalModel) => {
  const i = LABS.findIndex((l) => l.id === m.labId);
  return i < 0 ? LABS.length : i;
};

/** Every current model, lab by lab, and every retirement in the next 12 months. */
export function llmsFullTxt(index: CatalogIndex): string {
  const current = index.models
    .filter((m) => m.isCurrent && !m.aliasOnly)
    .sort(
      (a, b) =>
        TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier) ||
        labOrder(a) - labOrder(b) ||
        a.labName.localeCompare(b.labName) ||
        byNewest(a, b),
    );
  const byLab = new Map<string, CanonicalModel[]>();
  for (const m of current) byLab.set(m.labName, [...(byLab.get(m.labName) ?? []), m]);
  const leaving = retiring(index, { fromDays: 0, toDays: 365, tier: "all", apiOnly: true });
  return [
    "# Impulse: the full catalog",
    "",
    `> ${SUMMARY}`,
    "",
    about(index),
    "",
    "Each model line gives its lab, its type when it isn't a chat model, its release date, its list price at the lab's own API (or the host the catalog takes its price from), a lower price elsewhere when there is one, its context window and the APIs that serve it.",
    "",
    "## Retiring in the next 12 months",
    "",
    ...leaving.map(
      (it) =>
        `- [${it.model.name}](${site(modelHref(it.model))}) (${it.model.labName}): ${retirementDates(it.hosts)}.${
          it.successor ? ` Move to [${it.successor.name}](${site(modelHref(it.successor))}).` : ""
        }`,
    ),
    "",
    "## Current models",
    "",
    ...[...byLab].flatMap(([lab, models]) => [`### ${lab}`, "", ...models.map(modelLine), ""]),
  ].join("\n");
}
