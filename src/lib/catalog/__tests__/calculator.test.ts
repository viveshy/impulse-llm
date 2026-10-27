import { describe, expect, it } from "vitest";
import { priceAll, type CalcRow } from "@/lib/calculator";
import type { Model, Pricing } from "@/lib/domain/types";
import { calculatorRows } from "../calculator";
import { PRESETS } from "../cost";
import { buildIndex } from "../group";
import { loadSample, model, provider, TODAY } from "./helpers";

const { models, providers } = loadSample();
const index = buildIndex(models, providers, { now: TODAY });
const find = (rows: ReturnType<typeof calculatorRows>, slug: string) => rows.find((r) => r.s === slug);
const cheapest = (r: CalcRow) => priceAll([r], PRESETS[0].workload, "cheapest")[0];

describe("calculatorRows", () => {
  const rows = calculatorRows(index);

  it("carries frontier models with the lab's price and the other hosts' offers", () => {
    const opus = find(rows, "claude-opus-5-5")!;
    expect(opus).toMatchObject({ l: "anthropic", n: "Claude Opus 5.5", ln: "Anthropic", t: "frontier", lh: "Anthropic" });
    expect(opus.lab).toMatchObject({ inputPerMTok: 4, outputPerMTok: 20 });
    expect(opus.alt?.length).toBeGreaterThan(0);
  });

  it("carries recent open-weight models, priced at their cheapest host", () => {
    const oss = find(rows, "gpt-oss-120b")!;
    expect(oss.t).toBe("open");
    expect(cheapest(oss).host).toBe("DeepInfra");
  });

  it("leaves out older open models unless asked for by name", () => {
    expect(find(rows, "llama-3-3-70b-instruct")).toBeUndefined();
    const asked = find(calculatorRows(index, ["llama-3-3-70b-instruct"]), "llama-3-3-70b-instruct")!;
    expect(asked.lab).toBeUndefined();
    expect(cheapest(asked).host).toBe("Hyperbolic");
  });

  it("marks open-weight models", () => {
    expect(find(rows, "gpt-oss-120b")?.ow).toBe(true);
    expect(find(rows, "claude-opus-5-5")?.ow).toBeUndefined();
  });

  it("marks superseded models as older", () => {
    expect(find(rows, "claude-opus-5")?.old).toBe(true);
    expect(find(rows, "claude-opus-5-5")?.old).toBeUndefined();
  });

  it("keeps only the prices the estimate uses, and only those the host lists", () => {
    for (const r of rows) {
      for (const p of [r.lab, ...(r.alt ?? []).map((o) => o.p)]) {
        if (!p) continue;
        expect(Object.keys(p).every((k) => ["inputPerMTok", "outputPerMTok", "cachedInputPerMTok", "batchInputPerMTok", "batchOutputPerMTok", "longContext"].includes(k))).toBe(true);
        expect(Object.values({ ...p, ...p.longContext }).every((v) => v !== undefined)).toBe(true);
      }
    }
  });
});

describe("calculatorRows and the offers it compares", () => {
  const priced = (m: Model, pricing: Pricing): Model => ({ ...m, pricing });
  const withBatch = { inputPerMTok: 5, outputPerMTok: 25, batchInputPerMTok: 2.5, batchOutputPerMTok: 12.5 };
  const idx = buildIndex(
    [
      priced(model({ id: "1", name: "claude-opus-5-5", providerId: "a", releaseDate: "2026-09-22" }), withBatch),
      model({ id: "2", name: "us-gov.anthropic.claude-opus-5-5", providerId: "b", input: 6, output: 30, releaseDate: "2026-09-22" }),
      model({ id: "3", name: "anthropic.claude-opus-5-5", providerId: "b", input: 5, output: 25, releaseDate: "2026-09-22" }),
      priced(model({ id: "4", name: "claude-opus-5-5", providerId: "c", releaseDate: "2026-09-22" }), withBatch),
    ],
    [provider("a", "Anthropic", "frontier"), provider("b", "Amazon Bedrock", "cloud"), provider("c", "Vertex AI", "cloud")],
    { now: TODAY },
  );
  const opus = find(calculatorRows(idx), "claude-opus-5-5")!;

  it("carries one offer per distinct price sheet, preferred host first, without copies of the lab's", () => {
    expect(opus.lab).toEqual(withBatch);
    expect(opus.alt).toEqual([
      { p: { inputPerMTok: 5, outputPerMTok: 25 }, h: "Amazon Bedrock" },
      { p: { inputPerMTok: 6, outputPerMTok: 30 }, h: "Amazon Bedrock (us-gov)" },
    ]);
  });
});

describe("calculatorRows and special-purpose models", () => {
  const idx = buildIndex(
    [
      model({ id: "1", name: "gpt-6-sol", providerId: "o", releaseDate: "2026-09-22" }),
      model({ id: "2", name: "gpt-4o-mini-search-preview", providerId: "o", releaseDate: "2025-03-11" }),
    ],
    [provider("o", "OpenAI", "frontier")],
    { now: TODAY },
  );

  it("leaves search, audio and similar models out unless asked for", () => {
    expect(calculatorRows(idx).map((r) => r.s)).toEqual(["gpt-6-sol"]);
    expect(calculatorRows(idx, ["gpt-4o-mini-search-preview"]).map((r) => r.s)).toContain("gpt-4o-mini-search-preview");
  });
});

describe("calculatorRows and models their lab no longer sells", () => {
  const idx = buildIndex(
    [
      model({ id: "1", name: "claude-opus-5-5", providerId: "a", input: 4, output: 20, releaseDate: "2026-09-22" }),
      model({ id: "2", name: "anthropic.claude-opus-5-5", providerId: "b", input: 4, output: 20, releaseDate: "2026-09-22" }),
      model({ id: "3", name: "anthropic.claude-instant-v1", providerId: "b", input: 0.8, output: 2.4 }),
    ],
    [provider("a", "Anthropic", "frontier"), provider("b", "Amazon Bedrock", "cloud")],
    { now: TODAY },
  );

  it("counts a frontier model that only a cloud still sells as an older one", () => {
    const rows = calculatorRows(idx);
    expect(find(rows, "claude-instant-1")?.old).toBe(true);
    expect(find(rows, "claude-opus-5-5")?.old).toBeUndefined();
  });
});
