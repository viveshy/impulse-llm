import { describe, expect, it } from "vitest";
import type { PriceChange } from "@/lib/domain/types";
import { pinOf, type WatchItem } from "@/lib/watchlist";
import { buildIndex } from "../group";
import { exampleWatchlist, watchOptions, watchRows, watchSummary } from "../watch";
import { loadSample, model, provider, TODAY } from "./helpers";

const index = buildIndex(
  [
    // OpenAI retires gpt-5 on 11 Dec 2026; Azure on 9 Feb 2027, except in its US data zone.
    model({ id: "o-gpt5", name: "gpt-5", providerId: "o", releaseDate: "2025-08-07", deprecationDate: "2026-12-11", input: 1.25, output: 10 }),
    model({ id: "az-gpt5", name: "gpt-5", providerId: "az", deprecationDate: "2027-02-09", input: 1.25, output: 10 }),
    model({ id: "az-gpt5-eu", name: "gpt-5", providerId: "az", route: "eu", deprecationDate: "2027-02-09", input: 1.375, output: 11 }),
    model({ id: "az-gpt5-us", name: "gpt-5", providerId: "az", route: "us", input: 1.375, output: 11 }),
    // The newest in the line, on OpenAI and on Azure (global and EU).
    model({ id: "o-gpt55", name: "gpt-5.5", providerId: "o", releaseDate: "2026-04-01", input: 2, output: 12 }),
    model({ id: "az-gpt55", name: "gpt-5.5", providerId: "az", input: 2, output: 12 }),
    model({ id: "az-gpt55-eu", name: "gpt-5.5", providerId: "az", route: "eu", input: 2.2, output: 13.2 }),
    // Already retired on OpenAI.
    model({ id: "o-gpt41", name: "gpt-4.1", providerId: "o", releaseDate: "2025-04-14", deprecationDate: "2026-10-01" }),
    // Nothing scheduled.
    model({ id: "b-opus", name: "anthropic.claude-opus-5-5", providerId: "b", releaseDate: "2026-09-01", input: 5, output: 25 }),
  ],
  [provider("o", "OpenAI", "frontier"), provider("az", "Azure"), provider("b", "AWS - Bedrock")],
  { now: TODAY },
);

const row = (item: WatchItem, changes: PriceChange[] = []) => watchRows(index, [item], changes)[0];

const change = (listingId: string, from: [number, number], to: [number, number], at: string): PriceChange => ({
  listingId,
  name: listingId,
  host: { id: "x", name: "x" },
  from: { inputPerMTok: from[0], outputPerMTok: from[1] },
  to: { inputPerMTok: to[0], outputPerMTok: to[1] },
  at: `${at}T06:40:00+00:00`,
});

describe("watchRows", () => {
  it("counts down to the host's retirement and names the model to move to on that host", () => {
    const r = row({ model: "gpt-5", host: "openai" });
    expect(r.state).toBe("retiring");
    expect(r.retirements).toEqual([{ host: "OpenAI", date: "2026-12-11", byLab: true }]);
    expect(r.daysLeft).toBe(46);
    expect(r.listing?.id).toBe("o-gpt5");
    expect(r.successor?.model.slug).toBe("gpt-5-5");
    expect(r.successor?.listing?.id).toBe("o-gpt55");
    expect(r.successor?.delta).toBeCloseTo(4.5 / 3.4375 - 1);
  });

  it("says which part of the host's offer retires", () => {
    expect(row({ model: "gpt-5", host: "azure-openai" }).retirements).toEqual([
      { host: "Azure OpenAI", date: "2027-02-09", byLab: false, except: ["us"] },
    ]);
  });

  it("follows only the pinned listing, and suggests the successor in the same region", () => {
    const eu = row({ model: "gpt-5", host: "azure-openai", pin: pinOf("az-gpt5-eu") });
    expect(eu.state).toBe("retiring");
    expect(eu.retirements).toEqual([{ host: "Azure OpenAI", date: "2027-02-09", byLab: false }]);
    expect(eu.successor?.listing?.id).toBe("az-gpt55-eu");

    const us = row({ model: "gpt-5", host: "azure-openai", pin: pinOf("az-gpt5-us") });
    expect(us.state).toBe("ok");
    expect(us.retirements).toEqual([]);
    // Nothing retires, but a newer model is out; Azure has no US listing of it, so its main one.
    expect(us.successor?.model.slug).toBe("gpt-5-5");
    expect(us.successor?.listing?.id).toBe("az-gpt55");
  });

  it("says when the model, the host or the pinned version is gone", () => {
    const rows = watchRows(index, [
      { model: "gpt-9", host: "openai" },
      { model: "claude-opus-5-5", host: "openai" },
      { model: "gpt-5", host: "openai", pin: "000000000000" },
    ]);
    expect(rows.map((r) => r.state)).toEqual(["model-gone", "host-gone", "pin-gone"]);
    expect(rows.map((r) => r.hostName)).toEqual(["OpenAI", "OpenAI", "OpenAI"]);
    expect(rows[0].name).toBe("GPT-9");
    // A gone model still points at the newest model in its line.
    expect(rows[0].successor?.model.slug).toBe("gpt-5-5");
  });

  it("takes any slug a link carries, even one every object has as a key", () => {
    const rows = watchRows(index, [
      { model: "gpt-5", host: "constructor" },
      { model: "constructor", host: "openai" },
    ]);
    expect(rows.map((r) => typeof r.name)).toEqual(["string", "string"]);
    expect(rows.find((r) => r.hostSlug === "openai")?.name).toBe("Constructor");
  });

  it("marks a model the host has retired, with the day", () => {
    const r = row({ model: "gpt-4-1", host: "openai" });
    expect(r.state).toBe("retired");
    expect(r.retiredOn).toBe("2026-10-01");
    expect(r.successor?.model.slug).toBe("gpt-5-5");
  });

  it("tells an earliest-possible date from a shutdown", () => {
    const idx = buildIndex(
      [model({ id: "v-1", name: "claude-sonnet-5", providerId: "v", deprecationDate: "2026-12-24" })],
      [provider("v", "Google - Vertex AI")],
      { now: TODAY },
    );
    idx.bySlug.get("claude-sonnet-5")!.listings[0].notBefore = true;
    const [r] = watchRows(idx, [{ model: "claude-sonnet-5", host: "vertex-ai" }]);
    expect(r.state).toBe("not-before");
    expect(r.notBefore).toBe("2026-12-24");
    expect(r.retirements).toEqual([]);
  });

  it("puts what needs action first: gone, retired, then the soonest retirement", () => {
    const rows = watchRows(index, [
      { model: "claude-opus-5-5", host: "amazon-bedrock" },
      { model: "gpt-5", host: "azure-openai" },
      { model: "gpt-5", host: "openai" },
      { model: "gpt-4-1", host: "openai" },
      { model: "nope", host: "openai" },
    ]);
    expect(rows.map((r) => `${r.item.model}@${r.item.host}`)).toEqual([
      "nope@openai",
      "gpt-4-1@openai",
      "gpt-5@openai",
      "gpt-5@azure-openai",
      "claude-opus-5-5@amazon-bedrock",
    ]);
  });

  it("shows the latest price move on the watched listing", () => {
    const changes = [change("az-gpt5-eu", [1.25, 10], [1.375, 11], "2026-10-10")];
    const pinned = row({ model: "gpt-5", host: "azure-openai", pin: pinOf("az-gpt5-eu") }, changes);
    expect(pinned.priceMove?.change).toBeCloseTo(0.1);
    // Unpinned, the host's move is its regional listing's when that's the only one that moved.
    const host = row({ model: "gpt-5", host: "azure-openai" }, changes);
    expect(host.priceMove?.listing.id).toBe("az-gpt5-eu");
    expect(row({ model: "gpt-5", host: "openai" }, changes).priceMove).toBeUndefined();
  });

  it("links the host's own retirement notice when we know it", () => {
    expect(row({ model: "gpt-5", host: "openai" }).noticeUrl).toMatch(/^https:\/\/developers\.openai\.com\//);
    expect(row({ model: "claude-opus-5-5", host: "amazon-bedrock" }).noticeUrl).toMatch(/docs\.aws\.amazon\.com/);
  });
});

describe("watchSummary", () => {
  it("counts what needs action, what retires later, newer models and price moves", () => {
    const rows = watchRows(
      index,
      [
        { model: "gpt-5", host: "openai" },
        { model: "gpt-5", host: "azure-openai" },
        { model: "gpt-5", host: "azure-openai", pin: pinOf("az-gpt5-us") },
        { model: "gpt-4-1", host: "openai" },
        { model: "claude-opus-5-5", host: "amazon-bedrock" },
      ],
      [change("az-gpt5-eu", [1.25, 10], [1.375, 11], "2026-10-10")],
    );
    expect(watchSummary(rows)).toEqual({ total: 5, act: 2, later: 1, newer: 1, moved: 1 });
  });
});

describe("watchRows on the sample catalog", () => {
  const { models, providers } = loadSample();
  const sample = buildIndex(models, providers, { now: TODAY });

  it("shows only the parts of a host's offer still to retire", () => {
    // OpenAI dropped the 2024-05-13 snapshot of GPT-4o on 23 Oct; two more go in January.
    const [r] = watchRows(sample, [{ model: "gpt-4o", host: "openai" }]);
    expect(r.state).toBe("retiring");
    expect(r.retirements).toEqual([{ host: "OpenAI", date: "2027-01-14", byLab: true, only: ["2024-08-06", "2024-11-20"] }]);
  });
});

describe("watchOptions", () => {
  it("offers each host with its listings, the lab's own first, fine-tunes left out", () => {
    const opts = watchOptions(index.bySlug.get("gpt-5")!, index.today);
    expect(opts.map((o) => o.host.slug)).toEqual(["openai", "azure-openai"]);
    const azure = opts[1];
    expect(azure.host).toEqual({ slug: "azure-openai", name: "Azure OpenAI", kind: "cloud" });
    expect(azure.listings.map((l) => [l.pin, l.label, l.retires ?? null])).toEqual([
      [pinOf("az-gpt5"), "", "2027-02-09"],
      [pinOf("az-gpt5-eu"), "eu", "2027-02-09"],
      [pinOf("az-gpt5-us"), "us", null],
    ]);
  });
});

describe("exampleWatchlist", () => {
  const { models, providers } = loadSample();
  const sample = buildIndex(models, providers, { now: TODAY });

  it("picks a few frontier models that are all still listed, some of them retiring", () => {
    const items = exampleWatchlist(sample);
    expect(items.length).toBeGreaterThan(1);
    expect(items.length).toBeLessThanOrEqual(6);
    const rows = watchRows(sample, items);
    expect(rows.every((r) => !r.state.endsWith("gone"))).toBe(true);
    expect(rows.some((r) => r.state === "retiring")).toBe(true);
    expect(new Set(items.map((i) => `${i.model}@${i.host}`)).size).toBe(items.length);
  });
});
