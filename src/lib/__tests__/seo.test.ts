import { describe, expect, it } from "vitest";
import { buildIndex } from "@/lib/catalog/group";
import { caps, loadSample, model, provider, TODAY } from "@/lib/catalog/__tests__/helpers";
import { hostRetirements, liveSuccessor } from "@/lib/catalog/select";
import { modelHref, SITE_URL } from "@/lib/routes";
import { jsonLdString, llmsFullTxt, llmsTxt, modelAnswers, modelJsonLd, sitemapPages } from "@/lib/seo";
import { formatDate, formatTokens, formatUsd } from "@/lib/utils/format";

const { models, providers, generatedAt } = loadSample();
const index = buildIndex(models, providers, { now: TODAY, generatedAt });
const opus = index.bySlug.get("claude-opus-5-5")!;

const answer = (m: typeof opus, start: string) => modelAnswers(m, index).find((x) => x.q.startsWith(start))?.a;

describe("sitemap", () => {
  const paths = sitemapPages(index).map((p) => p.path);

  it("lists the index pages and every model, lab, host and cloud page once", () => {
    expect(paths).toEqual(expect.arrayContaining(["/", "/models", "/retiring", "/releases", "/clouds", "/calculator"]));
    expect(paths).toContain(modelHref(opus));
    expect(paths).toContain("/labs/anthropic");
    expect(paths).toContain("/hosts/amazon-bedrock");
    expect(paths).toContain("/clouds/aws");
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("leaves out alias-only models and the site's own stats", () => {
    for (const m of index.models.filter((m) => m.aliasOnly)) expect(paths).not.toContain(modelHref(m));
    expect(paths).not.toContain("/stats");
  });
});

describe("model answers", () => {
  it("give the price at the reference host, per million tokens", () => {
    const a = answer(opus, "How much does Claude Opus 5.5 cost")!;
    expect(a).toContain(opus.reference.host.name);
    expect(a).toContain(`${formatUsd(opus.reference.pricing.inputPerMTok)} per million input tokens`);
    expect(a).toContain(`${formatUsd(opus.reference.pricing.outputPerMTok!)} per million output tokens`);
  });

  it("name a cheaper host only when it saves at least 1%, not a rounding difference", () => {
    const p = [provider("a", "Anthropic", "frontier"), provider("hub", "AIHubMix")];
    const cost = (hubInput: number) => {
      const idx = buildIndex(
        [
          model({ id: "1", name: "claude-opus-5-5", providerId: "a", input: 4, output: 20 }),
          model({ id: "2", name: "claude-opus-5-5", providerId: "hub", input: hubInput, output: 20 }),
        ],
        p,
        { now: TODAY },
      );
      return modelAnswers(idx.bySlug.get("claude-opus-5-5")!, idx)[0].a;
    };
    expect(cost(3.99)).not.toContain("cheapest host");
    expect(cost(3)).toContain("The cheapest host is AIHubMix, at $3.00 per million input tokens");
  });

  it("explain the 3:1 mix only for models priced on output too", () => {
    const p = [provider("o", "OpenAI", "frontier"), provider("n", "Nebius AI Studio")];
    const embedding = { mode: "embedding", output: null, capabilities: caps() } as const;
    const idx = buildIndex(
      [
        model({ id: "1", name: "text-embedding-3-small", providerId: "o", input: 0.02, ...embedding }),
        model({ id: "2", name: "Qwen/Qwen3-Embedding-8B", providerId: "n", input: 0.01, openness: { isOpenWeights: true }, ...embedding }),
      ],
      p,
      { now: TODAY },
    );
    const m = idx.bySlug.get("text-embedding-3-small")!;
    const a = modelAnswers(m, idx).find((x) => x.q.startsWith("What are cheaper alternatives"))?.a;
    expect(a).toContain("Qwen3");
    expect(a).not.toContain("3 input tokens to 1 output token");
  });

  it("name the APIs that serve it and its context window", () => {
    expect(answer(opus, "Which APIs offer")).toMatch(new RegExp(`runs on ${opus.hostCount} APIs`));
    expect(answer(opus, "What is Claude Opus 5.5's context window")).toContain(`${formatTokens(opus.contextWindow)} tokens`);
  });

  it("give the retirement dates still to come, or say none is scheduled", () => {
    const leaving = index.models.find((m) =>
      hostRetirements(m, { apiOnly: true }).some((r) => r.date >= index.today && !r.only && !r.except),
    )!;
    const next = hostRetirements(leaving, { apiOnly: true }).find((r) => r.date >= index.today)!;
    expect(answer(leaving, `Is ${leaving.name} being retired`)).toContain(formatDate(next.date));

    const staying = index.models.find(
      (m) => !m.aliasOnly && m.hostCount > 0 && !hostRetirements(m, { apiOnly: true }).some((r) => r.date >= index.today),
    )!;
    expect(answer(staying, `Is ${staying.name} being retired`)).toMatch(/^No retirement date is scheduled/);
  });

  it("point an older model at the newest in its line", () => {
    const old = index.models.find((m) => liveSuccessor(m, index))!;
    const next = liveSuccessor(old, index)!;
    expect(answer(old, "Is there a newer version")).toMatch(new RegExp(`^Yes\\. ${next.name} is the newest`));
  });

  it("never use em dashes", () => {
    for (const m of index.models) for (const x of modelAnswers(m, index)) expect(`${x.q} ${x.a}`).not.toContain("—");
  });
});

describe("structured data", () => {
  const data = modelJsonLd(opus, modelAnswers(opus, index), index.generatedAt) as { "@graph": Record<string, unknown>[] };
  const node = (type: string) => data["@graph"].find((n) => n["@type"] === type)!;

  it("has a breadcrumb that ends at the model page", () => {
    const crumbs = (node("WebPage").breadcrumb as { itemListElement: { name: string; item: string }[] }).itemListElement;
    expect(crumbs.map((c) => c.name)).toEqual(["Models", "Anthropic", "Claude Opus 5.5"]);
    expect(crumbs.at(-1)!.item).toBe(`${SITE_URL}${modelHref(opus)}`);
  });

  it("carries the same questions the page shows", () => {
    expect((node("FAQPage").mainEntity as unknown[]).length).toBe(modelAnswers(opus, index).length);
  });

  it("can't close the script tag it is written into", () => {
    expect(jsonLdString({ a: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("llms.txt", () => {
  it("summarises the site and links the full catalog", () => {
    const txt = llmsTxt(index);
    expect(txt).toMatch(/^# Impulse\n\n> /);
    expect(txt).toContain(`${SITE_URL}/llms-full.txt`);
    expect(txt).toContain(`${SITE_URL}/retiring`);
    expect(txt).not.toContain("—");
  });

  it("lists every current model with its page, and the retirements to come", () => {
    const txt = llmsFullTxt(index);
    expect(txt).toContain(`[Claude Opus 5.5](${SITE_URL}${modelHref(opus)})`);
    expect(txt).toContain("## Retiring in the next 12 months");
    expect(txt).not.toContain("—");
  });
});
