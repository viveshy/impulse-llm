/**
 * The clouds the clouds pages cover and the zones their listings fall in. Browser-safe: the catalog logic is in
 * `@/lib/catalog/clouds`.
 */
export type CloudId = "aws" | "azure" | "google-cloud";

export interface Cloud {
  id: CloudId;
  name: string;
  /** For narrow spots: column heads, chips. */
  short: string;
  /** The services it sells models through, by host slug. */
  hosts: string[];
  /** The cloud's own table of which models run in which regions. */
  regionsUrl: string;
}

export const CLOUDS: Cloud[] = [
  {
    id: "aws",
    name: "AWS",
    short: "AWS",
    hosts: ["amazon-bedrock"],
    regionsUrl: "https://docs.aws.amazon.com/bedrock/latest/userguide/models-region-compatibility.html",
  },
  {
    id: "azure",
    name: "Microsoft Azure",
    short: "Azure",
    hosts: ["azure-openai", "azure-ai-foundry"],
    regionsUrl:
      "https://learn.microsoft.com/en-us/azure/foundry/foundry-models/concepts/models-sold-directly-by-azure-region-availability",
  },
  {
    id: "google-cloud",
    name: "Google Cloud",
    short: "Google Cloud",
    hosts: ["vertex-ai"],
    regionsUrl: "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/locations",
  },
];

/**
 * Clouds left out: the catalog's lists of their models lag their own (in October 2026 it had none of GPT-6, Gemini 4
 * Argon or Claude Sonnet 5.5 on Databricks, which serves all three), so a page built on it would say they lack models
 * they have. Their own lists instead.
 */
export const NOT_COVERED: { name: string; url: string }[] = [
  { name: "Databricks", url: "https://docs.databricks.com/aws/en/machine-learning/foundation-model-apis/supported-models" },
  { name: "Oracle Cloud", url: "https://docs.oracle.com/en-us/iaas/Content/generative-ai/pretrained-models.htm" },
  { name: "Snowflake", url: "https://docs.snowflake.com/en/user-guide/snowflake-cortex/aisql-regional-availability" },
];

export const cloudById = (id: string) => CLOUDS.find((c) => c.id === id);

export type ZoneId = "us" | "eu" | "apac" | "us-gov" | "global";

/** `where`: the zone in a sentence, after "in" or "outside". */
export const ZONES: { id: ZoneId; name: string; where: string }[] = [
  { id: "us", name: "US", where: "the US" },
  { id: "eu", name: "Europe", where: "Europe" },
  { id: "apac", name: "Asia Pacific", where: "Asia Pacific" },
  { id: "us-gov", name: "US government", where: "US government regions" },
  { id: "global", name: "Global", where: "global endpoints" },
];

/** Where a listing keeps the data it processes: a cross-region profile (`eu`) or one region (`eu-west-1`). */
export function zoneOf(region: string | undefined): ZoneId | undefined {
  if (!region) return undefined;
  if (region === "global") return "global";
  if (region === "us-gov" || region.startsWith("us-gov-")) return "us-gov";
  if (region === "us" || /^us-(east|west)-/.test(region)) return "us";
  if (region === "eu" || region === "uk" || region.startsWith("eu-")) return "eu";
  if (["apac", "ap", "au", "jp", "in"].includes(region) || region.startsWith("ap-")) return "apac";
  return undefined;
}
