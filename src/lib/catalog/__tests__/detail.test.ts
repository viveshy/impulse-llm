import { describe, expect, it } from "vitest";
import { buildIndex } from "../group";
import { hostRows, priceTiers } from "../detail";
import { loadSample, TODAY } from "./helpers";

describe("priceTiers", () => {
  it("lists every tier the price sheet has, with discounts against standard", () => {
    const tiers = priceTiers({
      inputPerMTok: 4,
      outputPerMTok: 20,
      cachedInputPerMTok: 0.2,
      cacheWritePerMTok: 5,
      cacheWrite1hPerMTok: 8,
      batchInputPerMTok: 2,
      batchOutputPerMTok: 10,
      priorityInputPerMTok: 7,
      priorityOutputPerMTok: 35,
      longContext: { thresholdTokens: 200_000, inputPerMTok: 8, outputPerMTok: 30 },
      webSearchPerQuery: 0.01,
      regionalUplift: 1.1,
    });
    expect(tiers.map((t) => t.label)).toEqual([
      "Standard",
      "Cached input",
      "Cache write, 5 minutes",
      "Cache write, 1 hour",
      "Batch",
      "Priority",
      "Prompts over 200K tokens",
      "Web search",
      "Regional endpoints",
    ]);
    expect(tiers.find((t) => t.id === "cached")?.note).toBe("95% off input");
    expect(tiers.find((t) => t.id === "batch")?.note).toBe("50% off");
    expect(tiers.find((t) => t.id === "priority")?.note).toBe("75% more");
    expect(tiers.find((t) => t.id === "search")?.note).toBe("$10.00 per 1,000 searches");
    expect(tiers.find((t) => t.id === "regional")?.note).toBe("10% more");
  });

  it("is just the standard row for a plain price sheet", () => {
    expect(priceTiers({ inputPerMTok: 1, outputPerMTok: 2 })).toEqual([
      { id: "standard", label: "Standard", input: 1, output: 2 },
    ]);
  });
});

describe("hostRows", () => {
  const { models, providers } = loadSample();
  const index = buildIndex(models, providers, { now: TODAY });
  const opus = index.bySlug.get("claude-opus-5-5")!;
  const rows = hostRows(opus);

  it("starts with the lab's own API", () => {
    expect(rows[0].listing.host.name).toBe("Anthropic");
    expect(rows[0].delta).toBe(0);
  });

  it("shows each host once and folds its regional listings under it", () => {
    const hosts = rows.map((r) => r.listing.hostId);
    expect(new Set(hosts).size).toBe(hosts.length);
    const bedrock = rows.find((r) => r.listing.host.name === "Amazon Bedrock")!;
    expect(bedrock.listing.region).toBeUndefined();
    expect(bedrock.others.length).toBeGreaterThan(0);
    expect(rows.reduce((n, r) => n + 1 + r.others.length, 0)).toBe(opus.listings.length);
  });

  it("puts subscription plans last, without a price comparison", () => {
    const last = rows[rows.length - 1];
    expect(last.listing.host.kind).toBe("subscription");
    expect(last.delta).toBeNull();
  });
});
