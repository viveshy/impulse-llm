import { readFileSync } from "node:fs";
import { CAPABILITY_KEYS, type Capabilities, type Model, type Provider, type ProviderCategory } from "@/lib/domain/types";
import { mapModel, mapProvider, type ModelDto, type ProviderDto } from "@/lib/data/http-source";

export const TODAY = new Date("2026-10-26T12:00:00Z");

export function loadSample(): { models: Model[]; providers: Provider[]; generatedAt?: string } {
  const raw = JSON.parse(readFileSync(new URL("../__fixtures__/sample.json", import.meta.url), "utf8")) as {
    models: ModelDto[];
    providers: ProviderDto[];
    meta?: { generated_at?: string };
  };
  return { models: raw.models.map(mapModel), providers: raw.providers.map(mapProvider), generatedAt: raw.meta?.generated_at };
}

export function caps(...keys: (keyof Capabilities)[]): Capabilities {
  const rec = Object.fromEntries(CAPABILITY_KEYS.map((k) => [k, false])) as Capabilities;
  for (const k of keys) rec[k] = true;
  return rec;
}

export function provider(id: string, name: string, category: ProviderCategory = "cloud"): Provider {
  return { id, name, monogram: name[0], description: "", website: "", category, authType: "api-key", regions: [], endpoints: [], sdks: [] };
}

type ModelInit = Partial<Omit<Model, "pricing">> & {
  id: string;
  name: string;
  providerId: string;
  input?: number;
  output?: number | null;
};

export function model({ input = 1, output = 2, ...m }: ModelInit): Model {
  return {
    description: "",
    mode: "chat",
    releaseDate: "",
    deprecation: "active",
    context: { contextWindow: 200_000, maxOutputTokens: 32_000 },
    capabilities: caps("streaming", "functionCalling", "toolCalling"),
    modalities: { input: ["text"], output: ["text"] },
    performance: {},
    openness: { isOpenWeights: false },
    endpointIds: [],
    features: [],
    reasoningEfforts: [],
    ...m,
    pricing: { inputPerMTok: input, outputPerMTok: output },
  };
}
