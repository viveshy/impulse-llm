import { buildIndex } from "../group";
import { model, provider, TODAY } from "./helpers";

/**
 * OpenAI, Anthropic and Google with Bedrock, both Azure services and Vertex. Bedrock and Azure OpenAI list regions;
 * Bedrock retires its US profile of Claude Opus 6 and has already retired Claude Sonnet 4.
 */
export const cloudIndex = buildIndex(
  [
    model({ id: "o-gpt7", name: "gpt-7", providerId: "o", releaseDate: "2026-09-01", input: 2, output: 10 }),
    model({ id: "az-gpt7", name: "gpt-7", providerId: "az", releaseDate: "2026-09-01", input: 2, output: 10 }),
    model({ id: "az-gpt7-eu", name: "gpt-7", providerId: "az", route: "eu", input: 2.2, output: 11 }),
    model({ id: "az-gpt7-us", name: "gpt-7", providerId: "az", route: "us", input: 2.2, output: 11 }),

    model({ id: "a-opus6", name: "claude-opus-6", providerId: "a", releaseDate: "2026-09-22", input: 5, output: 25 }),
    model({ id: "a-sonnet6", name: "claude-sonnet-6", providerId: "a", releaseDate: "2026-09-28", input: 3, output: 15 }),
    model({ id: "a-sonnet5", name: "claude-sonnet-5", providerId: "a", releaseDate: "2026-03-01", deprecationDate: "2026-08-01", input: 3, output: 15 }),
    model({ id: "a-sonnet4", name: "claude-sonnet-4", providerId: "a", releaseDate: "2025-05-14", deprecationDate: "2026-04-01", input: 3, output: 15 }),
    model({ id: "b-opus6-g", name: "global.anthropic.claude-opus-6", providerId: "b", input: 5, output: 25 }),
    model({ id: "b-opus6-eu", name: "eu.anthropic.claude-opus-6", providerId: "b", input: 5.5, output: 27.5 }),
    model({ id: "b-opus6-us", name: "us.anthropic.claude-opus-6", providerId: "b", deprecationDate: "2027-03-01", input: 5.5, output: 27.5 }),
    model({ id: "b-sonnet5", name: "anthropic.claude-sonnet-5", providerId: "b", deprecationDate: "2027-01-15", input: 3, output: 15 }),
    model({ id: "b-sonnet4", name: "anthropic.claude-sonnet-4", providerId: "b", deprecationDate: "2026-05-01", input: 3, output: 15 }),
    // Old and undated listings the catalog still carries for a cloud: nothing says they are served.
    model({ id: "b-claude21", name: "anthropic.claude-2-1", providerId: "b", releaseDate: "2023-11-21", input: 8, output: 24 }),
    model({ id: "b-instant", name: "anthropic.claude-instant-1", providerId: "b", input: 0.8, output: 2.4 }),
    model({ id: "af-opus6", name: "claude-opus-6", providerId: "af", input: 5, output: 25 }),
    model({ id: "v-opus6", name: "claude-opus-6", providerId: "v", input: 5, output: 25 }),

    model({ id: "g-gem5", name: "gemini-5-pro", providerId: "g", releaseDate: "2026-10-01", input: 1.25, output: 10 }),
    model({ id: "v-gem5", name: "gemini-5-pro", providerId: "v", input: 1.25, output: 10 }),
  ],
  [
    provider("o", "OpenAI", "frontier"),
    provider("a", "Anthropic", "frontier"),
    provider("g", "Google AI Studio - Gemini", "frontier"),
    provider("b", "AWS - Bedrock"),
    provider("az", "Azure"),
    provider("af", "Azure AI"),
    provider("v", "Google - Vertex AI"),
  ],
  { now: TODAY },
);

/**
 * Anthropic on Bedrock alone: Claude Opus 6 in the US only, Claude Sonnet 6 in Europe, and Claude Haiku 6 in the US and
 * once with no region, which could be anywhere.
 */
export const zonedIndex = buildIndex(
  [
    model({ id: "a-opus6", name: "claude-opus-6", providerId: "a", releaseDate: "2026-09-22", input: 5, output: 25 }),
    model({ id: "a-sonnet6", name: "claude-sonnet-6", providerId: "a", releaseDate: "2026-09-28", input: 3, output: 15 }),
    model({ id: "a-haiku6", name: "claude-haiku-6", providerId: "a", releaseDate: "2026-10-01", input: 1, output: 5 }),
    model({ id: "b-opus6-us", name: "us.anthropic.claude-opus-6", providerId: "b", input: 5.5, output: 27.5 }),
    model({ id: "b-sonnet6-eu", name: "eu.anthropic.claude-sonnet-6", providerId: "b", input: 3.3, output: 16.5 }),
    model({ id: "b-haiku6-us", name: "us.anthropic.claude-haiku-6", providerId: "b", input: 1.1, output: 5.5 }),
    model({ id: "b-haiku6", name: "anthropic.claude-haiku-6", providerId: "b", input: 1, output: 5 }),
  ],
  [provider("a", "Anthropic", "frontier"), provider("b", "AWS - Bedrock")],
  { now: TODAY },
);

/** Claude Sonnet 6 on Bedrock, whose US profile goes on 1 Dec 2026 and everything else on 8 Apr 2027; and Lyria on Vertex. */
export const staggeredIndex = buildIndex(
  [
    model({ id: "a-sonnet6", name: "claude-sonnet-6", providerId: "a", releaseDate: "2026-09-28", input: 3, output: 15 }),
    model({ id: "b-sonnet6", name: "anthropic.claude-sonnet-6", providerId: "b", deprecationDate: "2027-04-08", input: 3, output: 15 }),
    model({ id: "b-sonnet6-g", name: "global.anthropic.claude-sonnet-6", providerId: "b", deprecationDate: "2027-04-08", input: 3, output: 15 }),
    model({ id: "b-sonnet6-us", name: "us.anthropic.claude-sonnet-6", providerId: "b", deprecationDate: "2026-12-01", input: 3.3, output: 16.5 }),
    // Lyria makes music: not a model to chat with, whatever mode the source gives it.
    model({ id: "g-lyria", name: "lyria-3-pro-preview", providerId: "g", releaseDate: "2026-08-01" }),
    model({ id: "v-lyria", name: "lyria-3-pro-preview", providerId: "v" }),
  ],
  [
    provider("a", "Anthropic", "frontier"),
    provider("g", "Google AI Studio - Gemini", "frontier"),
    provider("b", "AWS - Bedrock"),
    provider("v", "Google - Vertex AI"),
  ],
  { now: TODAY },
);
