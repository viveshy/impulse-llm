import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BRANDS, cloudBrand, hostBrand, labBrand, logoSrc } from "@/lib/brands";
import { hostInfo } from "@/lib/catalog/hosts";
import { LABS } from "@/lib/catalog/labs";

const DIR = new URL("../../../public/logos/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".svg"));

describe("brand logos", () => {
  it("has a logo for every lab", () => {
    expect(LABS.filter((l) => !labBrand(l.id)).map((l) => l.id)).toEqual([]);
    expect(labBrand(null)).toBeUndefined();
  });

  it("has a logo for the labs' own APIs, the clouds and the big inference hosts", () => {
    const names = ["OpenAI", "Anthropic", "Google AI Studio - Gemini", "Google - Vertex AI", "Azure", "Azure AI", "AWS - Bedrock"];
    names.push("Groq AI", "Together AI", "Fireworks AI", "Cerebras", "DeepInfra", "GitHub Copilot", "ChatGPT Subscription");
    expect(names.filter((n) => !hostBrand(hostInfo(n, "cloud").slug))).toEqual([]);
  });

  it("ships exactly the files the map points at", () => {
    expect(files.sort()).toEqual(Object.keys(BRANDS).map((b) => `${b}.svg`).sort());
    expect(logoSrc("openai")).toBe("/logos/openai.svg");
  });

  it("keeps every file a plain drawing", () => {
    for (const f of files) {
      const svg = readFileSync(new URL(f, DIR), "utf8");
      expect(svg, f).toMatch(/^<svg[\s>]/);
      expect(svg, f).not.toMatch(/<script|<foreignObject|<image|\son[a-z]+=|href="(?!#)|url\((?!#)/i);
    }
  });
});

describe("brand lookups", () => {
  it("find nothing for keys that only exist on every object, which a link can carry", () => {
    for (const key of ["constructor", "__proto__", "toString", "hasOwnProperty"]) {
      expect(hostBrand(key), key).toBeUndefined();
      expect(labBrand(key), key).toBeUndefined();
      expect(cloudBrand(key), key).toBeUndefined();
    }
  });
});
