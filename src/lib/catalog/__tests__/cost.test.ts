import { describe, expect, it } from "vitest";
import { monthlyCost, PRESETS, type Workload } from "../cost";

const once: Workload = { inputTokens: 1_000_000, outputTokens: 1_000_000, requestsPerDay: 1, cacheHitRate: 0, batch: false };

describe("monthlyCost", () => {
  it("bills 30 days of input and output", () => {
    const c = monthlyCost({ inputPerMTok: 2, outputPerMTok: 10 }, once)!;
    expect(c.total).toBeCloseTo(360);
    expect(c.perRequest).toBeCloseTo(12);
  });

  it("bills cache hits at the cache-read price", () => {
    const c = monthlyCost({ inputPerMTok: 2, outputPerMTok: 10, cachedInputPerMTok: 0.2 }, { ...once, cacheHitRate: 0.5 })!;
    expect(c.perRequest).toBeCloseTo(11.1);
    expect(c.usedCache).toBe(true);
  });

  it("ignores cache hits when there is no cache price", () => {
    const c = monthlyCost({ inputPerMTok: 2, outputPerMTok: 10 }, { ...once, cacheHitRate: 0.5 })!;
    expect(c.perRequest).toBeCloseTo(12);
    expect(c.usedCache).toBe(false);
  });

  it("uses batch prices only when the host has them", () => {
    const without = monthlyCost({ inputPerMTok: 2, outputPerMTok: 10 }, { ...once, batch: true })!;
    expect(without.usedBatch).toBe(false);
    expect(without.total).toBeCloseTo(360);
    const withBatch = monthlyCost(
      { inputPerMTok: 2, outputPerMTok: 10, batchInputPerMTok: 1, batchOutputPerMTok: 5 },
      { ...once, batch: true },
    )!;
    expect(withBatch.usedBatch).toBe(true);
    expect(withBatch.total).toBeCloseTo(180);
  });

  it("switches to long-context prices above the threshold", () => {
    const c = monthlyCost(
      { inputPerMTok: 2, outputPerMTok: 10, longContext: { thresholdTokens: 272_000, inputPerMTok: 4, outputPerMTok: 15 } },
      { inputTokens: 300_000, outputTokens: 1_000, requestsPerDay: 1, cacheHitRate: 0, batch: false },
    )!;
    expect(c.longContext).toBe(true);
    expect(c.perRequest).toBeCloseTo(1.215);
  });

  describe("past the long-context threshold", () => {
    // Claude Haiku 5.5 at Anthropic: every price steps up above 100k input tokens.
    const haiku = {
      inputPerMTok: 0.1,
      outputPerMTok: 0.5,
      cachedInputPerMTok: 0.01,
      batchInputPerMTok: 0.05,
      batchOutputPerMTok: 0.25,
      longContext: {
        thresholdTokens: 100_000,
        inputPerMTok: 0.5,
        outputPerMTok: 2.5,
        cachedInputPerMTok: 0.05,
        batchInputPerMTok: 0.25,
        batchOutputPerMTok: 1.25,
      },
    };
    const long: Workload = { inputTokens: 150_000, outputTokens: 2_000, requestsPerDay: 100, cacheHitRate: 0, batch: false };

    it("bills batch requests at the long-prompt batch price", () => {
      const c = monthlyCost(haiku, { ...long, batch: true })!;
      expect(c.total).toBeCloseTo(120);
      expect(c.usedBatch).toBe(true);
      expect(c.longContext).toBe(true);
    });

    it("gives no batch discount when the host lists none for long prompts", () => {
      const c = monthlyCost(
        { ...haiku, longContext: { thresholdTokens: 100_000, inputPerMTok: 0.5, outputPerMTok: 2.5 } },
        { ...long, batch: true },
      )!;
      expect(c.total).toBeCloseTo(240);
      expect(c.usedBatch).toBe(false);
    });

    it("bills cache hits at the long-prompt cache-read price", () => {
      const c = monthlyCost(haiku, { ...long, cacheHitRate: 0.5 })!;
      expect(c.perRequest).toBeCloseTo(0.04625, 6);
      expect(c.usedCache).toBe(true);
    });

    it("gives no cache discount when the host lists none for long prompts", () => {
      const c = monthlyCost(
        { ...haiku, longContext: { thresholdTokens: 100_000, inputPerMTok: 0.5, outputPerMTok: 2.5 } },
        { ...long, cacheHitRate: 0.5 },
      )!;
      expect(c.perRequest).toBeCloseTo(0.08, 6);
      expect(c.usedCache).toBe(false);
    });
  });

  it("returns null for unpriced models", () => {
    expect(monthlyCost({ inputPerMTok: 0, outputPerMTok: null }, once)).toBeNull();
  });

  it("ships sensible presets", () => {
    expect(PRESETS.length).toBeGreaterThanOrEqual(3);
    for (const p of PRESETS) {
      expect(p.workload.inputTokens).toBeGreaterThan(0);
      expect(p.workload.cacheHitRate).toBeGreaterThanOrEqual(0);
      expect(p.workload.cacheHitRate).toBeLessThan(1);
    }
  });
});
