import { describe, expect, it } from "vitest";
import { effortsOf, featureLabels, MODALITY_LABEL, modalitiesOf } from "../capability-view";
import { buildIndex } from "../group";
import { loadSample, TODAY } from "./helpers";

const { models, providers } = loadSample();
const index = buildIndex(models, providers, { now: TODAY });
const get = (slug: string) => index.bySlug.get(slug)!;

describe("modalitiesOf", () => {
  it("adds what the capability and feature flags imply", () => {
    const io = modalitiesOf(get("claude-opus-5-5"));
    expect(io.input.sort()).toEqual(["image", "pdf", "text"]);
    expect(io.output).toEqual(["text"]);
  });

  it("keeps listed modalities", () => {
    expect(modalitiesOf(get("gemini-4-argon")).input.sort()).toEqual(["audio", "image", "pdf", "text", "video"]);
  });

  it("labels every modality it can return", () => {
    expect(MODALITY_LABEL.pdf).toBe("PDFs");
    expect(MODALITY_LABEL.image).toBe("Images");
  });
});

describe("featureLabels and effortsOf", () => {
  it("names features in plain words", () => {
    expect(featureLabels(get("claude-opus-5-5"))).toContain("Computer use");
    expect(featureLabels(get("gpt-6-1-sol"))).toContain("Parallel tool calls");
  });

  it("orders reasoning efforts from least to most", () => {
    const m = { ...get("claude-opus-5-5"), reasoningEfforts: ["max", "low", "high", "xhigh"] };
    expect(effortsOf(m)).toEqual(["low", "high", "xhigh", "max"]);
  });
});
