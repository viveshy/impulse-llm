import { describe, expect, it } from "vitest";
import { blended, buildIndex, cheapestListing } from "../group";
import { loadSample, model, provider, TODAY } from "./helpers";

const sample = loadSample();
const index = buildIndex(sample.models, sample.providers, { now: TODAY, generatedAt: sample.generatedAt });

describe("buildIndex on real listings", () => {
  const opus = index.bySlug.get("claude-opus-5-5")!;

  it("folds every Opus 5.5 listing into one model", () => {
    expect(opus).toBeDefined();
    expect(opus.labId).toBe("anthropic");
    expect(opus.name).toBe("Claude Opus 5.5");
    expect(opus.listings.length).toBeGreaterThanOrEqual(15);
    expect(index.models.filter((m) => m.name === "Claude Opus 5.5")).toHaveLength(1);
  });

  it("prices it from Anthropic's own API", () => {
    expect(opus.reference.host.name).toBe("Anthropic");
    expect(opus.reference.pricing.inputPerMTok).toBe(4);
    expect(opus.reference.pricing.outputPerMTok).toBe(20);
    expect(opus.reference.blended).toBe(8);
  });

  it("dates it and keeps the chat kind although Perplexity lists it as responses", () => {
    expect(opus.releaseDate).toBe("2026-09-22");
    expect(opus.listings.some((l) => l.mode === "responses")).toBe(true);
    expect(opus.kind).toBe("chat");
    expect(opus.tier).toBe("frontier");
  });

  it("counts hosts without subscriptions", () => {
    const hosts = new Set(opus.listings.filter((l) => l.host.kind !== "subscription" && l.host.kind !== "local").map((l) => l.hostId));
    expect(opus.hostCount).toBe(hosts.size);
    expect(opus.listings.some((l) => l.host.kind === "subscription")).toBe(true);
  });

  it("folds fast mode in as a flagged listing, never the reference", () => {
    const fast = opus.listings.filter((l) => l.fast);
    expect(fast.length).toBeGreaterThan(0);
    expect(opus.reference.fast).toBe(false);
  });

  it("groups GPT-4o snapshots and dates the model by the earliest", () => {
    const gpt4o = index.bySlug.get("gpt-4o")!;
    expect(gpt4o.listings.filter((l) => l.snapshot).length).toBeGreaterThan(2);
    expect(gpt4o.releaseDate).toBe("2024-05-13");
    expect(gpt4o.reference.snapshot).toBeUndefined();
  });

  it("finds a listing's model by GUID", () => {
    const anyOpusListing = opus.listings[3];
    expect(index.byListingId.get(anyOpusListing.id)?.slug).toBe("claude-opus-5-5");
  });

  it("marks open-weight models as open tier even from a frontier lab", () => {
    const oss = index.bySlug.get("gpt-oss-120b")!;
    expect(oss.labId).toBe("openai");
    expect(oss.openWeights).toBe(true);
    expect(oss.tier).toBe("open");
  });

  it("summarises hosts", () => {
    const anthropic = index.hosts.find((h) => h.name === "Anthropic")!;
    expect(anthropic.kind).toBe("first-party");
    expect(anthropic.frontierCount).toBeGreaterThan(0);
    expect(index.hostBySlug.get("amazon-bedrock")?.name).toBe("Amazon Bedrock");
  });
});

describe("buildIndex edge cases", () => {
  const p = [provider("p-copilot", "GitHub Copilot"), provider("p-a", "Anthropic", "frontier"), provider("p-x", "Some Gateway")];

  it("never takes a subscription listing as the reference", () => {
    const idx = buildIndex(
      [
        model({ id: "1", name: "claude-test-9", providerId: "p-copilot", input: 1, output: 2 }),
        model({ id: "2", name: "claude-test-9", providerId: "p-x", input: 3, output: 6 }),
      ],
      p,
      { now: TODAY },
    );
    expect(idx.bySlug.get("claude-test-9")!.reference.id).toBe("2");
  });

  it("falls back to an unpriced listing and says so", () => {
    const idx = buildIndex([model({ id: "1", name: "mystery-model", providerId: "p-x", input: 0, output: null })], p, { now: TODAY });
    const m = idx.bySlug.get("mystery-model")!;
    expect(m.reference.priced).toBe(false);
    expect(m.reference.blended).toBeNull();
    expect(m.labSlug).toBe("other");
  });

  it("blends 3:1 input to output", () => {
    expect(blended(2, 10)).toBe(4);
    expect(blended(0.5, null)).toBe(0.5);
    expect(blended(0, null)).toBeNull();
    expect(blended(0, 0)).toBeNull();
  });

  it("reads a $0 output price as not listed, so an embedding costs the same at every host", () => {
    expect(blended(0.15, 0)).toBe(0.15);
    const idx = buildIndex(
      [
        model({ id: "1", name: "codestral-embed", providerId: "p-x", mode: "embedding", input: 0.15, output: null }),
        model({ id: "2", name: "codestral-embed", providerId: "p-y", mode: "embedding", input: 0.15, output: 0 }),
      ],
      [provider("p-x", "Mistral AI API", "frontier"), provider("p-y", "Vercel AI Gateway")],
      { now: TODAY },
    );
    expect(idx.bySlug.get("codestral-embed")!.listings.map((l) => l.blended)).toEqual([0.15, 0.15]);
  });
});

describe("aliases and references", () => {
  const p = [
    provider("g", "Google AI Studio - Gemini", "frontier"),
    provider("hub", "AIHubMix"),
    provider("sail", "Sail"),
    provider("di", "DeepInfra", "cloud"),
  ];

  it("marks a version-less -latest alias and keeps its line's lineage intact", () => {
    const idx = buildIndex(
      [
        model({ id: "1", name: "gemini-pro-latest", providerId: "g", releaseDate: "2026-04-27" }),
        model({ id: "2", name: "gemini-2.5-pro", providerId: "g", releaseDate: "2025-06-17" }),
        model({ id: "3", name: "gemini-3.1-pro", providerId: "g", releaseDate: "2026-04-27" }),
      ],
      p,
      { now: TODAY },
    );
    expect(idx.bySlug.get("gemini-pro")!.aliasOnly).toBe(true);
    expect(idx.bySlug.get("gemini-3-1-pro")!.aliasOnly).toBe(false);
    expect(idx.bySlug.get("gemini-2-5-pro")!.successorSlug).toBe("gemini-3-1-pro");
  });

  it("prices a model without a lab listing at its cheapest well-known host", () => {
    const idx = buildIndex(
      [
        model({ id: "1", name: "open-thing-1", providerId: "sail", input: 0.01, output: 0.02 }),
        model({ id: "2", name: "open-thing-1", providerId: "di", input: 0.05, output: 0.1 }),
        model({ id: "3", name: "open-thing-1", providerId: "hub", input: 0.2, output: 0.4 }),
      ],
      p,
      { now: TODAY },
    );
    expect(idx.bySlug.get("open-thing-1")!.reference.host.name).toBe("DeepInfra");
  });
});

describe("cheapestListing", () => {
  it("keeps the lab's own API when another host lists the same price", () => {
    const idx = buildIndex(
      [
        model({ id: "1", name: "anthropic.claude-test-9", providerId: "b", input: 5, output: 25 }),
        model({ id: "2", name: "claude-test-9", providerId: "a", input: 5, output: 25 }),
      ],
      [provider("b", "Amazon Bedrock", "cloud"), provider("a", "Anthropic", "frontier")],
      { now: TODAY },
    );
    expect(cheapestListing(idx.bySlug.get("claude-test-9")!)?.host.name).toBe("Anthropic");
  });
});

describe("path-named hosts", () => {
  const fal = provider("p-fal", "Fal AI", "inference");
  const aiml = provider("p-aiml", "AI/ML API", "inference");
  const index = buildIndex(
    [
      model({ id: "f1", name: "edit", providerId: "p-fal", route: "openai-gpt-image-2", litellmProvider: "fal_ai", mode: "image_generation" }),
      model({ id: "f2", name: "edit", providerId: "p-fal", route: "low-1024-x-768-openai-gpt-image-2", litellmProvider: "fal_ai", mode: "image_generation" }),
      model({ id: "f3", name: "edit", providerId: "p-fal", route: "flux-kontext", litellmProvider: "fal_ai", mode: "image_generation" }),
      model({ id: "f4", name: "dev", providerId: "p-fal", route: "flux", litellmProvider: "fal_ai", mode: "image_generation" }),
      model({ id: "a1", name: "dev", providerId: "p-aiml", route: "flux", litellmProvider: "aiml", mode: "image_generation" }),
    ],
    [fal, aiml],
    { now: TODAY },
  );

  it("keeps different fal models with the same leaf name apart", () => {
    expect(index.bySlug.get("edit")).toBeUndefined();
    const gptEdit = index.bySlug.get("gpt-image-2-edit");
    expect(gptEdit?.listings.map((l) => l.id)).toEqual(["f1", "f2"]);
    expect(gptEdit?.labId).toBe("openai");
    expect(gptEdit?.name).toBe("GPT Image 2 Edit");
    expect(index.bySlug.get("flux-kontext-edit")?.listings).toHaveLength(1);
  });

  it("folds the same model from two path-named hosts", () => {
    expect(index.bySlug.get("flux-dev")?.hostCount).toBe(2);
    expect(index.bySlug.get("flux-dev")?.name).toBe("FLUX Dev");
  });
});
