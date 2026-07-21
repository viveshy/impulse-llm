import type { ModelQuery } from "@/lib/domain/types";

export const qk = {
  providers: ["providers"] as const,
  provider: (id: string) => ["provider", id] as const,
  models: (query: ModelQuery) => ["models", query] as const,
  model: (id: string) => ["model", id] as const,
  modelsByProvider: (id: string) => ["models", "by-provider", id] as const,
  facets: ["facets"] as const,
};
