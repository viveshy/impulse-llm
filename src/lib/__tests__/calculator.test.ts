import { describe, expect, it } from "vitest";
import { PRESETS, type Workload } from "@/lib/catalog/cost";
import { foldVariants, parseWorkload, priceAll, visibleRows, workloadParams, type CalcRow } from "../calculator";

const row = (s: string, extra: Partial<CalcRow>): CalcRow => ({ s, l: "lab", n: s, ln: "Lab", lh: "Lab API", t: "frontier", ctx: 200_000, ...extra });
const w: Workload = { inputTokens: 1_000, outputTokens: 1_000, requestsPerDay: 1_000, cacheHitRate: 0, batch: false };

const rows: CalcRow[] = [
  row("pricey", { lab: { inputPerMTok: 10, outputPerMTok: 30 }, alt: [{ p: { inputPerMTok: 8, outputPerMTok: 24 }, h: "Cloud" }] }),
  row("cheap", { lab: { inputPerMTok: 1, outputPerMTok: 2 } }),
  row("hosted-only", {
    alt: [
      { p: { inputPerMTok: 0.6, outputPerMTok: 1.2 }, h: "Dear host" },
      { p: { inputPerMTok: 0.5, outputPerMTok: 1 }, h: "Host" },
    ],
  }),
  row("small-window", { lab: { inputPerMTok: 0.1, outputPerMTok: 0.1 }, ctx: 1_500 }),
];

describe("priceAll", () => {
  it("prices at the lab's API and sorts by the monthly bill", () => {
    const r = priceAll(rows, w, "lab");
    expect(r.map((x) => x.row.s)).toEqual(["hosted-only", "cheap", "pricey", "small-window"]);
    expect(r.find((x) => x.row.s === "pricey")).toMatchObject({ host: "Lab API", est: { total: 1_200 } });
  });

  it("can price at the cheapest host instead", () => {
    const r = priceAll(rows, w, "cheapest");
    expect(r.find((x) => x.row.s === "pricey")).toMatchObject({ host: "Cloud", est: { total: 960 } });
  });

  it("falls back to the cheapest price that exists", () => {
    expect(priceAll(rows, w, "lab").find((x) => x.row.s === "hosted-only")?.host).toBe("Host");
    expect(priceAll(rows, w, "cheapest").find((x) => x.row.s === "cheap")?.host).toBe("Lab API");
  });

  describe("at the cheapest host", () => {
    const lab = { inputPerMTok: 5, outputPerMTok: 25, cachedInputPerMTok: 0.5, batchInputPerMTok: 2.5, batchOutputPerMTok: 12.5 };

    it("picks the host that is cheapest for the workload, not by list price", () => {
      // A slightly lower list price elsewhere, but only the lab sells batch and cache prices.
      const opus = row("opus", { lab, alt: [{ p: { inputPerMTok: 4.9, outputPerMTok: 24.5 }, h: "Cloud" }] });
      expect(priceAll([opus], w, "cheapest")[0].host).toBe("Cloud");
      expect(priceAll([opus], { ...w, batch: true }, "cheapest")[0]).toMatchObject({ host: "Lab API", est: { usedBatch: true, total: 450 } });
      expect(priceAll([opus], { ...w, cacheHitRate: 0.5 }, "cheapest")[0]).toMatchObject({ host: "Lab API", est: { usedCache: true } });
    });

    it("keeps the lab's own API on a tie", () => {
      const opus = row("opus", { lab, alt: [{ p: { inputPerMTok: 5, outputPerMTok: 25 }, h: "Cloud" }] });
      expect(priceAll([opus], w, "cheapest")[0].host).toBe("Lab API");
    });

    it("moves to another host when it is cheaper for this workload", () => {
      const cheapOut = row("x", {
        lab: { inputPerMTok: 1, outputPerMTok: 10 },
        alt: [{ p: { inputPerMTok: 2, outputPerMTok: 4 }, h: "Cloud" }],
      });
      expect(priceAll([cheapOut], { ...w, outputTokens: 100 }, "cheapest")[0].host).toBe("Lab API");
      expect(priceAll([cheapOut], { ...w, inputTokens: 100 }, "cheapest")[0].host).toBe("Cloud");
    });
  });

  it("flags requests that overflow the context window and lists them last", () => {
    const r = priceAll(rows, w, "lab");
    expect(r.at(-1)).toMatchObject({ row: { s: "small-window" }, fits: false });
    expect(r.filter((x) => !x.fits)).toHaveLength(1);
  });
});

describe("visibleRows", () => {
  const set: CalcRow[] = [
    row("frontier-new", {}),
    row("frontier-old", { old: true }),
    row("open-new", { t: "open" }),
    row("open-old", { t: "open", old: true }),
  ];
  const slugs = (r: CalcRow[]) => r.map((x) => x.s);

  it("shows current frontier models by default", () => {
    expect(slugs(visibleRows(set, { open: false, older: false, pinned: [] }))).toEqual(["frontier-new"]);
  });

  it("adds open-weight and older models on request", () => {
    expect(slugs(visibleRows(set, { open: true, older: true, pinned: [] }))).toEqual(slugs(set));
  });

  it("treats a frontier lab's open-weight model as open-weight", () => {
    const oss = row("frontier-open", { ow: true });
    expect(slugs(visibleRows([oss], { open: false, older: false, pinned: [] }))).toEqual([]);
    expect(slugs(visibleRows([oss], { open: true, older: false, pinned: [] }))).toEqual(["frontier-open"]);
  });

  it("always shows pinned models", () => {
    expect(slugs(visibleRows(set, { open: false, older: false, pinned: ["open-old"] }))).toEqual(["frontier-new", "open-old"]);
  });
});

describe("workload in the URL", () => {
  it("defaults to the chat assistant preset", () => {
    expect(parseWorkload({})).toEqual(PRESETS[0].workload);
  });

  it("reads every field", () => {
    expect(parseWorkload({ rpd: "250", in: "12000", out: "800", cache: "40", batch: "1" })).toEqual({
      requestsPerDay: 250,
      inputTokens: 12_000,
      outputTokens: 800,
      cacheHitRate: 0.4,
      batch: true,
    });
  });

  it("replaces junk with defaults and caps the cache share", () => {
    const d = PRESETS[0].workload;
    expect(parseWorkload({ rpd: "-5", in: "abc", out: "0", cache: "150" })).toEqual({ ...d, cacheHitRate: 0.95 });
  });

  it("round-trips", () => {
    const x: Workload = { requestsPerDay: 75, inputTokens: 3_500, outputTokens: 120, cacheHitRate: 0.65, batch: true };
    expect(workloadParams(x)).toEqual({ rpd: "75", in: "3500", out: "120", cache: "65", batch: "1" });
    expect(parseWorkload(workloadParams(x))).toEqual(x);
  });
});

describe("foldVariants", () => {
  const same = { inputPerMTok: 2, outputPerMTok: 6 };
  const opus = { inputPerMTok: 5, outputPerMTok: 25 };
  const set: CalcRow[] = [
    row("grok-4-20-reasoning", { n: "Grok 4.20 Reasoning", l: "xai", lab: same }),
    row("grok-4-20-multi-agent", { n: "Grok 4.20 Multi Agent", l: "xai", lab: same }),
    row("grok-4-20-non-reasoning", { n: "Grok 4.20 Non-Reasoning", l: "xai", lab: same }),
    row("grok-4-7", { n: "Grok 4.7", l: "xai", lab: same }),
    row("claude-opus-4-6", { n: "Claude Opus 4.6", l: "anthropic", lab: opus }),
    row("claude-opus-4-7", { n: "Claude Opus 4.7", l: "anthropic", lab: opus }),
    row("gpt-6-luna", { n: "GPT-6 Luna", l: "openai", lab: { inputPerMTok: 0.1, outputPerMTok: 0.5 } }),
    row("gpt-6-sol", { n: "GPT-6 Sol", l: "openai", lab: { inputPerMTok: 2, outputPerMTok: 10 } }),
  ];
  const folded = foldVariants(priceAll(set, w, "lab"), []);
  const slugs = folded.map((r) => r.row.s);

  it("folds same-priced variants of one versioned model into its shortest name", () => {
    expect(folded.find((r) => r.row.s === "grok-4-20-reasoning")?.variants).toEqual(["Grok 4.20 Multi Agent", "Grok 4.20 Non-Reasoning"]);
    expect(slugs).not.toContain("grok-4-20-multi-agent");
    expect(slugs).not.toContain("grok-4-20-non-reasoning");
  });

  it("keeps different versions and different prices apart", () => {
    expect(slugs).toEqual(expect.arrayContaining(["grok-4-7", "claude-opus-4-6", "claude-opus-4-7", "gpt-6-luna", "gpt-6-sol"]));
    expect(folded.find((r) => r.row.s === "grok-4-7")?.variants).toEqual([]);
  });

  it("never folds a pinned model", () => {
    const pinned = foldVariants(priceAll(set, w, "lab"), ["grok-4-20-multi-agent"]);
    expect(pinned.map((r) => r.row.s)).toContain("grok-4-20-multi-agent");
    expect(pinned.find((r) => r.row.s === "grok-4-20-reasoning")?.variants).toEqual(["Grok 4.20 Non-Reasoning"]);
  });

  it("keeps the ranking order", () => {
    const totals = folded.map((r) => r.est.total);
    expect(totals).toEqual([...totals].sort((a, b) => a - b));
  });
});
