import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { cloudIndex as index, staggeredIndex, zonedIndex } from "@/lib/catalog/__tests__/cloud-fixture";
import { cloudOverview, cloudPage } from "@/lib/catalog/clouds";
import { CloudMatrix } from "@/components/clouds/CloudMatrix";
import { CloudOffersTable } from "@/components/clouds/CloudOffersTable";
import { MissingTable } from "@/components/clouds/MissingTable";

const render = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
/** The table row that holds `text`. */
const rowWith = (html: string, text: string) => html.split("<tr>").find((r) => r.includes(text)) ?? "";

describe("CloudMatrix", () => {
  const html = render(createElement(CloudMatrix, { overview: cloudOverview(index) }));

  it("says in words, not only with a tick, whether each cloud sells a model", () => {
    const gpt7 = rowWith(html, ">GPT-7<");
    expect(gpt7).toContain('<span class="sr-only">Not on AWS</span>');
    expect(gpt7).toContain('<span class="sr-only">On Microsoft Azure:</span>');
    expect(gpt7).toContain("lab price");
  });

  it("groups each lab's models under the lab's heading, for screen readers too", () => {
    expect(html.match(/<tbody>/g)).toHaveLength(3);
    expect(html.match(/scope="rowgroup"/g)).toHaveLength(3);
    expect(html).not.toContain('scope="colgroup"');
  });
});

describe("CloudOffersTable", () => {
  it("dates a partial retirement and says which part goes", () => {
    const aws = cloudPage(index, "aws")!;
    const html = render(createElement(CloudOffersTable, { offers: aws.lineup, today: index.today, services: false, regions: true }));
    expect(html).toContain("1 Mar 2027 · us only");
    expect(html).toContain("Partly retires in 126 days");
    expect(html).toContain("US, Europe, Global");
  });

  it("dates the retirement of all of it, and a part that goes sooner under it", () => {
    const aws = cloudPage(staggeredIndex, "aws")!;
    const html = render(createElement(CloudOffersTable, { offers: aws.lineup, today: staggeredIndex.today, services: false, regions: true }));
    expect(html).toContain("Retires in 164 days");
    expect(html).toContain("First: 1 Dec 2026 · us only");
  });

  it("names the service each model is sold through when the cloud has more than one", () => {
    const azure = cloudPage(index, "azure")!;
    const html = render(createElement(CloudOffersTable, { offers: azure.lineup, today: index.today, services: true, regions: true }));
    expect(rowWith(html, ">GPT-7<")).toContain("OpenAI · Azure OpenAI");
    expect(rowWith(html, ">Claude Opus 6<")).toContain("Anthropic · Azure AI Foundry");
  });
});

describe("MissingTable", () => {
  it("sends a reader to the other clouds, or to the model's hosts when no cloud sells it", () => {
    const aws = cloudPage(index, "aws")!;
    const html = render(createElement(MissingTable, { missing: aws.missing, cloud: aws.cloud }));
    expect(rowWith(html, ">GPT-7<")).toContain('href="/clouds/azure"');
    const sonnet = rowWith(html, ">Claude Sonnet 6<");
    expect(sonnet).toContain("None of these clouds.");
    expect(sonnet).toContain('href="/models/anthropic/claude-sonnet-6#hosts"');
  });

  it("tells a model the cloud sells outside the chosen zone from one it doesn't sell", () => {
    const eu = cloudPage(zonedIndex, "aws", "eu")!;
    const html = render(createElement(MissingTable, { missing: eu.missing, cloud: eu.cloud, outside: "outside Europe" }));
    expect(rowWith(html, ">Claude Opus 6<")).toContain("On AWS, outside Europe");
    const us = cloudPage(index, "azure", "us")!;
    expect(rowWith(render(createElement(MissingTable, { missing: us.missing, cloud: us.cloud, outside: "outside the US" })), ">Gemini 5 Pro<")).not.toContain("On Microsoft Azure");
  });

  it("doesn't place a model outside the zone when a listing of it names no region, and points to the cloud's own list", () => {
    const eu = cloudPage(zonedIndex, "aws", "eu")!;
    const haiku = rowWith(render(createElement(MissingTable, { missing: eu.missing, cloud: eu.cloud, outside: "outside Europe" })), ">Claude Haiku 6<");
    expect(haiku).toContain("On AWS, region not listed.");
    expect(haiku).toContain(`href="${eu.cloud.regionsUrl}"`);
    expect(haiku).not.toContain("outside Europe");
  });
});
