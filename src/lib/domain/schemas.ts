import { z } from "zod";
import type { Capabilities, Model, Provider } from "./types";

/**
 * Zod schemas mirroring the domain model. Used to validate data at the
 * ingest boundary (seed now, real API later) so the UI can trust its types.
 */

const modalitySchema = z.enum(["text", "image", "audio", "video", "embedding"]);
const deprecationSchema = z.enum(["active", "deprecating", "deprecated", "preview"]);
const providerCategorySchema = z.enum(["frontier", "open", "cloud", "inference"]);
const authTypeSchema = z.enum(["api-key", "bearer", "oauth", "aws-sigv4"]);
const methodSchema = z.enum(["GET", "POST", "PUT", "DELETE"]);

const endpointSchema = z.object({
  id: z.string(),
  name: z.string(),
  method: methodSchema,
  path: z.string(),
  description: z.string(),
  streaming: z.boolean(),
  auth: z.string(),
});

const sdkSchema = z.object({
  language: z.string(),
  packageName: z.string(),
  installCommand: z.string(),
  docsUrl: z.string(),
});

export const providerSchema = z.object({
  id: z.string(),
  name: z.string(),
  monogram: z.string(),
  description: z.string(),
  website: z.string(),
  apiBase: z.string().optional(),
  category: providerCategorySchema,
  authType: authTypeSchema,
  regions: z.array(z.string()),
  endpoints: z.array(endpointSchema),
  sdks: z.array(sdkSchema),
  foundedYear: z.number().optional(),
}) satisfies z.ZodType<Provider>;

const capabilitiesSchema = z.object({
  streaming: z.boolean(),
  functionCalling: z.boolean(),
  toolCalling: z.boolean(),
  jsonMode: z.boolean(),
  structuredOutputs: z.boolean(),
  reasoning: z.boolean(),
  vision: z.boolean(),
  audio: z.boolean(),
  imageInput: z.boolean(),
  imageGeneration: z.boolean(),
  video: z.boolean(),
  embeddings: z.boolean(),
  batchApi: z.boolean(),
  promptCaching: z.boolean(),
  mcp: z.boolean(),
}) satisfies z.ZodType<Capabilities>;

export const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  providerId: z.string(),
  family: z.string().optional(),
  description: z.string(),
  mode: z.string().optional(),
  releaseDate: z.string(),
  deprecation: deprecationSchema,
  pricing: z.object({
    inputPerMTok: z.number(),
    outputPerMTok: z.number().nullable(),
    cachedInputPerMTok: z.number().optional(),
    batchDiscount: z.number().optional(),
  }),
  context: z.object({
    contextWindow: z.number(),
    maxOutputTokens: z.number(),
  }),
  capabilities: capabilitiesSchema,
  modalities: z.object({
    input: z.array(modalitySchema),
    output: z.array(modalitySchema),
  }),
  performance: z.object({
    ttftMs: z.number().optional(),
    tokensPerSec: z.number().optional(),
    availabilityPct: z.number().optional(),
  }),
  rateLimits: z
    .object({ rpm: z.number().optional(), tpm: z.number().optional(), tier: z.string().optional() })
    .optional(),
  benchmarks: z.array(z.object({ name: z.string(), score: z.number(), max: z.number() })).optional(),
  openness: z.object({
    isOpenWeights: z.boolean(),
    license: z.string().optional(),
    openSourceScore: z.number().optional(),
    runtimes: z.array(z.string()).optional(),
    minVramGb: z.number().optional(),
  }),
  popularity: z.number().optional(),
  tags: z.array(z.string()).optional(),
  endpointIds: z.array(z.string()),
  metadata: z.record(z.string(), z.unknown()).optional(),
}) satisfies z.ZodType<Model>;

/**
 * Parse an array of records, dropping (and logging) any that fail validation
 * rather than crashing the whole app on one bad record.
 */
export function parseValid<T>(schema: z.ZodType<T>, records: unknown[], label: string): T[] {
  const out: T[] = [];
  for (const record of records) {
    const result = schema.safeParse(record);
    if (result.success) {
      out.push(result.data);
    } else if (process.env.NODE_ENV !== "production") {
      const id = (record as { id?: string })?.id ?? "<unknown>";
      console.warn(`[atlas] dropped invalid ${label} "${id}":`, result.error.issues[0]?.message);
    }
  }
  return out;
}
