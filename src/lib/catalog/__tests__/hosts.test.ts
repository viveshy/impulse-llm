import { describe, expect, it } from "vitest";
import { hostInfo } from "../hosts";

describe("hostInfo", () => {
  it("names Bedrock as a cloud", () => {
    expect(hostInfo("AWS - Bedrock", "cloud")).toMatchObject({ slug: "amazon-bedrock", name: "Amazon Bedrock", kind: "cloud" });
  });
  it("marks subscriptions", () => {
    expect(hostInfo("GitHub Copilot", "cloud").kind).toBe("subscription");
    expect(hostInfo("ChatGPT Subscription", "cloud").kind).toBe("subscription");
  });
  it("cleans up Google AI Studio and ties it to Google", () => {
    expect(hostInfo("Google AI Studio - Gemini", "frontier")).toMatchObject({
      name: "Google AI Studio",
      kind: "first-party",
      labId: "google",
    });
  });
  it("marks local runtimes", () => {
    expect(hostInfo("Ollama", "open").kind).toBe("local");
  });
  it("falls back on the API category", () => {
    expect(hostInfo("Brand New Inference Co", "inference")).toMatchObject({
      kind: "inference",
      slug: "brand-new-inference-co",
      name: "Brand New Inference Co",
    });
  });
});
