/**
 * Listing names → canonical model keys.
 *
 * Hosts spell the same model many ways: `claude-opus-5-5`, `claude-opus-5.5`,
 * `us.anthropic.claude-opus-5-5`, `claude-opus-5-5@default`, `databricks-claude-opus-5-5`.
 * `parseListingName` strips what describes the *listing* (region, vendor prefix, snapshot
 * date, cloud version suffix, alias) and keeps what names the *model*.
 */
import { LABS } from "./labs";
import { slugify, versionDotsToDashes } from "./text";

export interface ParsedName {
  key: string;
  /** Snapshot stamp: YYYY-MM-DD, YYYY-MM, MM-DD or MMDD, as precise as the name allows. */
  snapshot?: string;
  /** Cross-region inference profile from a Bedrock prefix (`us.`, `eu.`, `global.`…). */
  region?: string;
  /** Vendor prefix a cloud put in front of the model id (`anthropic.`). */
  vendor?: string;
  /** OpenAI fine-tuned-model inference (`ft:`). */
  fineTune: boolean;
  /** Anthropic fast mode, listed as a separate `-fast` model. */
  fast: boolean;
  /** A moving alias (`-latest`). */
  alias: boolean;
}

const REGION_PREFIX = /^(us-gov|us|eu|apac|ap|au|jp|ca|sa|global|in|uk)\./;
const VENDOR_PREFIX =
  /^(openai|anthropic|meta|mistral|mistralai|google|cohere|amazon|ai21|deepseek|writer|stability|luma|qwen|xai|moonshot|moonshotai|zai|minimax|nvidia|twelvelabs|ibm)\./;
const FULL_DATE = /-(20\d\d)-?(0[1-9]|1[0-2])-?(0[1-9]|[12]\d|3[01])$/;
const MONTH_YEAR = /-(0[1-9]|1[0-2])-(20\d\d)$/;
const PREVIEW_MONTH_DAY = /-(preview|exp)-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const MMDD = /^(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])$/;
const QUANT = /^(fp8|fp16|bf16|int4|int8|awq|gptq|gguf|mxfp4?|nvfp4|q4|q8)$/;
/** Families that use bare MMDD snapshot tokens (`gpt-4-0613`, `grok-4.20-0309`, `deepseek-r1-0528`). */
const MMDD_FAMILIES = /^(gpt|chatgpt|o\d|tts|whisper|dall-e|grok|gemini|text-embedding|deepseek|kimi|glm|minimax|qwen)/;

export function parseListingName(name: string, opts: { hostName?: string } = {}): ParsedName {
  const out: ParsedName = { key: "", fineTune: false, fast: false, alias: false };
  let s = name.trim().toLowerCase();

  if (s.startsWith("ft:")) {
    out.fineTune = true;
    s = s.slice(3).split(":")[0];
  }
  s = s.split("/").filter(Boolean).pop() ?? "";

  const at = s.indexOf("@");
  if (at >= 0) {
    const tag = s.slice(at + 1).match(/^(20\d\d)(\d\d)(\d\d)$/);
    if (tag) out.snapshot = `${tag[1]}-${tag[2]}-${tag[3]}`;
    s = s.slice(0, at);
  }

  const region = s.match(REGION_PREFIX);
  if (region) {
    out.region = region[1];
    s = s.slice(region[0].length);
  }
  const vendor = s.match(VENDOR_PREFIX);
  if (vendor) {
    out.vendor = vendor[1];
    s = s.slice(vendor[0].length);
  }

  const host = opts.hostName ?? "";
  if (/databricks/i.test(host)) s = s.replace(/^databricks-/, "");
  if (/fireworks/i.test(host)) s = s.replace(/(\d)p(\d)/g, "$1.$2").replace(/^llama-v(\d)/, "llama-$1");

  // Claude 1/2 used `v` versions: claude-v2:1 is Claude 2.1, claude-instant-v1 is Instant 1.
  s = s.replace(/^claude-(instant-)?v(\d+)(?::(\d+))?$/, (_m, inst: string | undefined, maj: string, min?: string) =>
    `claude-${inst ?? ""}${maj}${min ? `-${min}` : ""}`,
  );
  // Cloud model-version suffixes: Bedrock `-v1:0`, `-1:0`; Vertex MaaS.
  s = s.replace(/-v\d+(:\d+)?$/, "").replace(/-\d+:\d+$/, "").replace(/:\d+$/, "").replace(/-maas$/, "");
  s = s.replace(/_/g, "-");

  const full = s.match(FULL_DATE);
  if (full) {
    out.snapshot ??= `${full[1]}-${full[2]}-${full[3]}`;
    s = s.slice(0, -full[0].length);
  } else {
    const monthYear = s.match(MONTH_YEAR);
    const previewDay = s.match(PREVIEW_MONTH_DAY);
    if (monthYear) {
      out.snapshot ??= `${monthYear[2]}-${monthYear[1]}`;
      s = s.slice(0, -monthYear[0].length);
    } else if (previewDay) {
      out.snapshot ??= `${previewDay[2]}-${previewDay[3]}`;
      s = s.slice(0, -previewDay[0].length) + `-${previewDay[1]}`;
    }
  }
  if (/^(gemini|imagen|veo)/.test(s)) s = s.replace(/-0\d\d$/, "");

  let tokens = s.split("-").filter(Boolean);
  // Quantised builds are the same model: qwen3-32b-fp8, gpt-oss-120b-mxfp4-gguf.
  while (tokens.length > 1 && QUANT.test(tokens[tokens.length - 1])) tokens.pop();
  if (tokens.includes("latest")) {
    out.alias = true;
    tokens = tokens.filter((t) => t !== "latest");
  }
  if (MMDD_FAMILIES.test(s)) {
    tokens = tokens.filter((t, i) => {
      if (i < 2 || !MMDD.test(t)) return true;
      out.snapshot ??= t;
      return false;
    });
  }
  s = tokens.join("-");

  s = versionDotsToDashes(s)
    .replace(/[.:]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  s = s.replace(/^gpt-35(?=-|$)/, "gpt-3-5");
  // From Claude 4 on, Anthropic puts the tier first: claude-4-sonnet → claude-sonnet-4.
  s = s.replace(/^claude-(\d+)(?:-(\d+))?-(opus|sonnet|haiku)(-.*)?$/, (m, maj: string, min?: string, tier?: string, rest?: string) =>
    Number(maj) >= 4 ? `claude-${tier}-${maj}${min ? `-${min}` : ""}${rest ?? ""}` : m,
  );
  if (/^claude-/.test(s) && s.endsWith("-fast")) {
    out.fast = true;
    s = s.slice(0, -"-fast".length);
  }

  out.key = s || slugify(name) || "unknown";
  return out;
}

/** Hosts whose catalog name is only the last path segment (`fal-ai/flux/dev` is "dev"). */
const PATH_NAMED = new Set(["fal_ai", "aiml"]);
const IMAGE_VARIANT = /^(?:(?:low|medium|high|standard|hd)-)?\d+-x-\d+(?:-|$)/;

/**
 * For path-named hosts the route holds the rest of the model's path; put it back. A lab
 * at the front of the path becomes a vendor prefix (`openai/…`) so the lab is credited.
 */
export function qualifiedName(name: string, route: string | undefined, litellmProvider: string | undefined): string {
  if (!route || !litellmProvider || !PATH_NAMED.has(litellmProvider)) return name;
  const path = route.replace(IMAGE_VARIANT, "");
  if (!path) return name;
  const lab = LABS.find((l) => path.startsWith(`${l.id}-`));
  return lab ? `${lab.id}/${path.slice(lab.id.length + 1)}-${name}` : `${path}-${name}`;
}

export interface RouteInfo {
  region?: string;
  deployment?: string;
  commitment: boolean;
  variant?: string;
}

const AWS_REGION =
  /^(us-gov-(east|west)-\d|us-(east|west)-\d|ca-(central|west)-\d|sa-east-\d|eu-(west|central|north|south)-\d|ap-(northeast|southeast|south|east)-\d|me-(central|south)-\d|af-south-\d|il-central-\d|mx-central-\d)$/;
const ZONES = new Set(["us", "eu", "apac", "au", "jp", "global", "us-gov", "uk", "ca", "in"]);
const DEPLOYMENTS: Record<string, string> = {
  "global-standard": "Global Standard",
  "data-zone": "Data Zone",
  provisioned: "Provisioned",
  mantle: "Mantle",
  "claude-platform": "Claude Platform",
  invoke: "Invoke API",
  converse: "Converse API",
};

/**
 * The API's `route` is whatever sits between the host and the model name in the
 * LiteLLM key (`azure/eu/gpt-6-sol` → `eu`). Only some of it is a region or deployment;
 * vendor org paths (`qwen`, `accounts-fireworks-models`) are dropped.
 */
export function routeInfo(route: string | undefined, litellmProvider?: string): RouteInfo {
  const out: RouteInfo = { commitment: false };
  let r = route ?? "";

  const commitment = r.match(/-?\d+-month-commitment$/);
  if (commitment) {
    out.commitment = true;
    r = r.slice(0, -commitment[0].length);
  }

  const image = r.match(/^(?:(low|medium|high|standard|hd)-)?(\d+)-x-(\d+)(?:-|$)/);
  if (image) {
    const size = `${image[2]}×${image[3]}`;
    out.variant = image[1] ? `${image[1]} · ${size}` : size;
  } else if (AWS_REGION.test(r) || ZONES.has(r)) {
    out.region = r;
  } else if (DEPLOYMENTS[r]) {
    out.deployment = DEPLOYMENTS[r];
  }

  if (!out.deployment && litellmProvider === "bedrock_mantle") out.deployment = "Mantle";
  return out;
}
