/**
 * Retirement dates checked by hand against the hosts' own notices. The catalog takes its dates
 * from LiteLLM's price list, which sometimes has one wrong, leaves it off an alias, or gives the
 * earliest day a host may retire a model ("not sooner than", "or later") as if it were a
 * shutdown. An entry applies only while the listing still carries the value we checked, so a
 * fix upstream wins over ours.
 */
import type { DeprecationStatus } from "@/lib/domain/types";
import type { LabId } from "./labs";

export interface Notice {
  /** Host slug. */
  host: string;
  /** API model ids at that host. */
  ids: string[];
  /** Only the listing in this region; null for the one outside any region. Any listing when left out. */
  region?: string | null;
  /** The date LiteLLM gave when we checked (null: none). */
  reported: string | null;
  /** The date on the host's notice (null: none announced). */
  date: string | null;
  /** The host gives the date as the earliest it may retire the model, not as a shutdown. */
  notBefore?: true;
  source: string;
  checked: string;
}

const OPENAI = "https://developers.openai.com/api/docs/deprecations";
const GEMINI_API = "https://ai.google.dev/gemini-api/docs/deprecations";
const VERTEX = "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions";
const VERTEX_CLAUDE = "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/partner-models/claude";
const AZURE = "https://learn.microsoft.com/en-us/azure/foundry/openai/concepts/model-retirement-schedule";
const BEDROCK = "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle-legacy.html";

const CHECKED = "2026-10-26";

/** Vertex gives every Claude model it sells a "Retirement date not sooner than". */
const vertexClaude = (model: string, version: string, reported: string, date = reported): Notice => ({
  host: "vertex-ai",
  ids: [`claude-${model}`, `claude-${model}@${version}`],
  reported,
  date,
  notBefore: true,
  source: `${VERTEX_CLAUDE}/${model}`,
  checked: CHECKED,
});

/** A model Vertex lists with a retirement date "or later". */
const vertexOrLater = (ids: string[], date: string): Notice => ({
  host: "vertex-ai",
  ids,
  reported: date,
  date,
  notBefore: true,
  source: VERTEX,
  checked: CHECKED,
});

export const NOTICES: Notice[] = [
  // OpenAI retires the alias and its snapshot together; LiteLLM dates only one of them.
  {
    host: "openai",
    ids: ["o3", "o3-pro", "gpt-5", "gpt-5-mini", "gpt-5-nano", "gpt-5-pro"],
    reported: null,
    date: "2026-12-11",
    source: OPENAI,
    checked: CHECKED,
  },
  { host: "openai", ids: ["gpt-4o-mini-tts"], reported: null, date: "2027-01-06", source: OPENAI, checked: CHECKED },
  { host: "openai", ids: ["gpt-4o-mini-transcribe-2025-12-15"], reported: null, date: "2027-02-26", source: OPENAI, checked: CHECKED },
  {
    host: "openai",
    ids: ["gpt-5.1-2025-11-13", "gpt-5.4-nano-2026-03-17"],
    reported: null,
    date: "2027-04-01",
    source: OPENAI,
    checked: CHECKED,
  },

  // Google: Gemini API dates are "the earliest possible dates on which a model might be retired";
  // this one is a generally available model that Vertex lists for the same day "or later".
  { host: "google-ai-studio", ids: ["gemini-3.1-flash-lite"], reported: "2027-05-07", date: "2027-05-07", notBefore: true, source: GEMINI_API, checked: CHECKED },
  // The unversioned id serves multimodalembedding@001, which retires on 2027-04-01.
  { host: "vertex-ai", ids: ["multimodalembedding"], reported: null, date: "2027-04-01", source: VERTEX, checked: CHECKED },
  vertexOrLater(["veo-3.1-generate-001", "veo-3.1-fast-generate-001"], "2026-11-17"),
  vertexOrLater(["gemini-3.1-flash-lite"], "2027-05-07"),
  vertexOrLater(["gemini-3.5-flash"], "2027-05-19"),
  vertexOrLater(["gemini-3.1-flash-image", "gemini-3-pro-image"], "2027-05-28"),
  vertexOrLater(["gemini-3.1-flash-lite-image"], "2027-06-28"),
  vertexOrLater(["gemini-3.5-flash-lite"], "2027-07-21"),
  vertexClaude("sonnet-4-5", "20250929", "2026-09-29"),
  vertexClaude("haiku-4-5", "20251001", "2026-10-15", "2026-12-07"),
  vertexClaude("opus-4-5", "20251101", "2026-11-24"),
  vertexClaude("sonnet-5", "default", "2026-12-24"),
  vertexClaude("opus-5", "default", "2027-01-24"),
  vertexClaude("opus-4-6", "default", "2027-02-05"),
  vertexClaude("fable-5-1", "default", "2027-03-01"),
  vertexClaude("opus-4-7", "default", "2027-04-16"),
  vertexClaude("opus-4-8", "default", "2027-05-28"),
  vertexClaude("fable-5", "default", "2027-06-08"),

  // Microsoft Foundry's retirement schedule
  { host: "azure-openai", ids: ["sora-2"], reported: "2026-11-02", date: "2026-10-15", source: AZURE, checked: CHECKED },
  { host: "azure-openai", ids: ["gpt-realtime-2"], reported: "2026-10-31", date: "2027-01-20", source: AZURE, checked: CHECKED },
  { host: "azure-ai-foundry", ids: ["claude-opus-5-5-fast"], reported: "2027-10-01", date: "2027-01-15", source: AZURE, checked: CHECKED },

  // Bedrock: Haiku 4.5 has no end-of-life date; Sonnet 4.5 leaves every commercial region on 2027-04-08.
  { host: "amazon-bedrock", ids: ["eu.anthropic.claude-haiku-4-5-20251001-v1:0"], reported: "2026-10-15", date: null, source: BEDROCK, checked: CHECKED },
  {
    host: "amazon-bedrock",
    ids: ["claude-sonnet-4-5-20250929-v1:0"],
    region: null,
    reported: null,
    date: "2027-04-08",
    source: BEDROCK,
    checked: CHECKED,
  },
];

export interface NoticePage {
  /** Host slugs that publish their dates here. */
  hosts: string[];
  /** Only for these labs' models; any lab's when left out. */
  labs?: LabId[];
  name: string;
  url: string;
}

/** Where each host publishes its retirement dates. */
export const NOTICE_PAGES: NoticePage[] = [
  { hosts: ["openai"], name: "OpenAI", url: OPENAI },
  { hosts: ["anthropic"], name: "Anthropic", url: "https://platform.claude.com/docs/en/about-claude/model-deprecations" },
  { hosts: ["google-ai-studio"], name: "Gemini API", url: GEMINI_API },
  { hosts: ["vertex-ai"], labs: ["google"], name: "Vertex AI", url: VERTEX },
  // Vertex gives each Claude model its retirement date on that model's page, linked from this one.
  { hosts: ["vertex-ai"], labs: ["anthropic"], name: "Claude on Vertex AI", url: VERTEX_CLAUDE },
  // One schedule for Azure OpenAI and for the models Foundry sells directly (Claude, Grok, DeepSeek...).
  { hosts: ["azure-openai", "azure-ai-foundry"], name: "Microsoft Foundry", url: AZURE },
  {
    hosts: ["amazon-bedrock"],
    name: "Amazon Bedrock",
    url: "https://docs.aws.amazon.com/bedrock/latest/userguide/model-lifecycle.html",
  },
];

/** Where a host announces the retirement of a lab's model: the page we checked one of these listings on, else its page for that lab's models. */
export function noticeFor(host: string, labId: LabId | null, apiModelIds: string[]): string | undefined {
  const checked = NOTICES.find((n) => n.host === host && n.ids.some((id) => apiModelIds.includes(id)));
  if (checked) return checked.source;
  return NOTICE_PAGES.find((p) => p.hosts.includes(host) && (!p.labs || (!!labId && p.labs.includes(labId))))?.url;
}

/** The day the newest entry was checked. */
export const NOTICES_CHECKED = NOTICES.map((n) => n.checked).sort().at(-1)!;

interface Dated {
  deprecationDate?: string;
  status: DeprecationStatus;
  region?: string;
}

/** The listing's date and status as the host's notice has them, when we checked this listing. */
export function applyNotice<T extends Dated>(hostSlug: string, apiModelId: string, l: T): T & { notBefore: boolean } {
  const n = NOTICES.find(
    (n) =>
      n.host === hostSlug &&
      n.ids.includes(apiModelId) &&
      (n.region === undefined || (l.region ?? null) === n.region) &&
      n.reported === (l.deprecationDate ?? null),
  );
  if (!n) return { ...l, notBefore: false };
  const status: DeprecationStatus =
    l.status === "preview" ? "preview" : n.date && !n.notBefore ? "deprecating" : "active";
  return { ...l, deprecationDate: n.date ?? undefined, status, notBefore: !!n.notBefore };
}
