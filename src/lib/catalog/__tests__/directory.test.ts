import { describe, expect, it } from "vitest";
import { hostPage, labPage, labSummaries } from "../directory";
import { buildIndex } from "../group";
import { loadSample, model, provider, TODAY } from "./helpers";

const { models, providers } = loadSample();
const index = buildIndex(models, providers, { now: TODAY });
const slugs = (ms: { slug: string }[]) => ms.map((m) => m.slug);

describe("labSummaries", () => {
  const labs = labSummaries(index);

  it("lists the frontier labs first, in their usual order", () => {
    expect(labs.slice(0, 4).map((l) => l.slug)).toEqual(["openai", "anthropic", "google", "xai"]);
  });

  it("counts models and finds the newest general-purpose one", () => {
    const a = labs.find((l) => l.slug === "anthropic")!;
    expect(a).toMatchObject({ name: "Anthropic", tier: "frontier", modelCount: 8 });
    expect(a.newest?.slug).toBe("claude-haiku-5-5");
    expect(a.hostCount).toBeGreaterThan(3);
  });

  it("skips labs with nothing but moving aliases", () => {
    expect(labs.find((l) => l.slug === "mistral")).toBeUndefined();
  });

  it("counts what the lab page shows: the models not retired, and the lineup", () => {
    const a = labs.find((l) => l.slug === "anthropic")!;
    const p = labPage(index, "anthropic")!;
    expect(a.modelCount).toBe(p.lineup.length + p.specialised.length + p.older.length);
    expect(a.lineupCount).toBe(p.lineup.length);
  });

  it("leaves retired models out of the count, and old or special-purpose ones out of the lineup", () => {
    const idx = buildIndex(
      [
        model({ id: "1", name: "gpt-6-sol", providerId: "o", releaseDate: "2026-09-22" }),
        // Newest in its own line, but two years old.
        model({ id: "2", name: "gpt-4o", providerId: "o", releaseDate: "2024-05-13" }),
        model({ id: "3", name: "gpt-image-2", providerId: "o", mode: "image_generation", releaseDate: "2026-04-01" }),
        model({ id: "4", name: "gpt-5", providerId: "o", releaseDate: "2025-08-07", deprecationDate: "2026-10-01" }),
      ],
      [provider("o", "OpenAI", "frontier")],
      { now: TODAY },
    );
    expect(labSummaries(idx)[0]).toMatchObject({ slug: "openai", modelCount: 3, lineupCount: 1 });
  });
});

describe("labPage", () => {
  it("splits a lab's models into the current lineup and older ones", () => {
    const p = labPage(index, "anthropic")!;
    expect(slugs(p.lineup)).toEqual(["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"]);
    expect(slugs(p.older)).toEqual(expect.arrayContaining(["claude-opus-5", "claude-sonnet-5", "claude-2-1"]));
    expect(slugs(p.older)).not.toContain("claude-opus-5-5");
  });

  it("lists where the lab's models run, busiest host first", () => {
    const p = labPage(index, "anthropic")!;
    expect(p.hosts[0].count).toBeGreaterThanOrEqual(p.hosts.at(-1)!.count);
    expect(p.hosts.map((h) => h.host.slug)).toContain("amazon-bedrock");
  });

  it("returns null for an unknown lab", () => {
    expect(labPage(index, "nope")).toBeNull();
  });
});

describe("hostPage", () => {
  it("offers each model once, at its cheapest price on the host", () => {
    const p = hostPage(index, "amazon-bedrock")!;
    const opus = p.offers.find((o) => o.model.slug === "claude-opus-5-5")!;
    expect(opus.listing.pricing.inputPerMTok).toBe(4);
    expect(opus.otherListings).toBe(12);
    expect(opus.vsHeadline).toBe(0);
  });

  it("skips unpriced listings and doesn't compare a host with itself", () => {
    const claude2 = hostPage(index, "amazon-bedrock")!.offers.find((o) => o.model.slug === "claude-2-1")!;
    expect(claude2.listing.pricing.inputPerMTok).toBe(8);
    expect(claude2.vsHeadline).toBeNull();
    expect(hostPage(index, "anthropic")!.offers.every((o) => o.vsHeadline === null)).toBe(true);
  });

  it("puts frontier models first, newest first", () => {
    expect(hostPage(index, "amazon-bedrock")!.offers[0].model.slug).toBe("claude-haiku-5-5");
  });

  it("returns null for an unknown host", () => {
    expect(hostPage(index, "nope")).toBeNull();
  });
});

describe("host counts", () => {
  const idx = buildIndex(
    [
      model({ id: "1", name: "gpt-6-sol", providerId: "o", releaseDate: "2026-09-22" }),
      model({ id: "2", name: "gpt-chat-latest", providerId: "o" }),
      model({ id: "3", name: "gpt-chat-latest", providerId: "hub" }),
    ],
    [provider("o", "OpenAI", "frontier"), provider("hub", "AIHubMix")],
    { now: TODAY },
  );

  it("count only the models the host's page lists", () => {
    const openai = idx.hostBySlug.get("openai")!;
    expect(slugs(hostPage(idx, "openai")!.offers.map((o) => o.model))).toEqual(["gpt-6-sol"]);
    expect([openai.modelCount, openai.frontierCount]).toEqual([1, 1]);
  });

  it("leave out a host that serves nothing but a moving alias", () => {
    expect(idx.hosts.map((h) => h.name)).toEqual(["OpenAI"]);
  });
});
