import { describe, expect, it } from "vitest";
import { mapModel, mapPriceChange, type ModelDto } from "../http-source";

const dto = (pricing: Partial<ModelDto["pricing"]>): ModelDto => ({
  guid: "g",
  name: "m",
  family: null,
  mode: "chat",
  status: "active",
  provider: { guid: "p", name: "P" },
  description: "",
  releaseDate: null,
  popularity: null,
  isOpenWeights: false,
  license: null,
  openSourceScore: null,
  minVramGb: null,
  runtimes: [],
  contextWindow: 1000,
  maxOutputTokens: 100,
  capabilities: [],
  modalities: { input: ["text"], output: ["text"] },
  tags: [],
  pricing: { inputPerMtok: null, outputPerMtok: null, cachedInputPerMtok: null, ...pricing },
  performance: { ttftMs: null, tokensPerSec: null, availabilityPct: null },
});

describe("mapModel", () => {
  it("removes float noise from prices", () => {
    const m = mapModel(dto({ inputPerMtok: 0.09999999999999999, outputPerMtok: 4.300000000000001, cachedInputPerMtok: 0.19999999999999998 }));
    expect(m.pricing.inputPerMTok).toBe(0.1);
    expect(m.pricing.outputPerMTok).toBe(4.3);
    expect(m.pricing.cachedInputPerMTok).toBe(0.2);
  });

  it("keeps a missing output price null", () => {
    expect(mapModel(dto({ inputPerMtok: 0.02 })).pricing.outputPerMTok).toBeNull();
  });
});

describe("mapPriceChange", () => {
  it("maps a price move and cleans the floats", () => {
    const c = mapPriceChange({
      guid: "l1",
      name: "gpt-6.1",
      provider: { guid: "p1", name: "OpenAI" },
      route: null,
      from: { inputPerMtok: 2.5000000000000004, outputPerMtok: 10 },
      to: { inputPerMtok: 1.25, outputPerMtok: null },
      at: "2026-10-20T06:40:00+00:00",
    });
    expect(c).toEqual({
      listingId: "l1",
      name: "gpt-6.1",
      host: { id: "p1", name: "OpenAI" },
      from: { inputPerMTok: 2.5, outputPerMTok: 10 },
      to: { inputPerMTok: 1.25, outputPerMTok: null },
      at: "2026-10-20T06:40:00+00:00",
    });
  });
});
