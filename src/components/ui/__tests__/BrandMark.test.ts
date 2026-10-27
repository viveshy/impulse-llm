import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CloudMark, HostMark, LabMark } from "@/components/ui/BrandMark";

const lab = (labId: string | null, name: string) => renderToStaticMarkup(createElement(LabMark, { labId, name }));
const host = (slug: string, name: string) => renderToStaticMarkup(createElement(HostMark, { slug, name }));

describe("brand marks", () => {
  it("draws a one-colour logo in the text colour, so it reads in both themes", () => {
    const html = lab("openai", "OpenAI");
    expect(html).toContain("mask:url(/logos/openai.svg)");
    expect(html).toContain("bg-current");
  });

  it("shows a colour logo as it is", () => {
    expect(lab("google", "Google")).toContain("background:url(/logos/google.svg)");
    expect(lab("alibaba", "Alibaba (Qwen)")).toContain("background:url(/logos/qwen.svg)");
    expect(lab("google", "Google")).not.toContain("mask:");
  });

  it("finds a host's logo by its slug", () => {
    expect(host("amazon-bedrock", "AWS - Bedrock")).toContain("background:url(/logos/bedrock.svg)");
    expect(host("chatgpt", "ChatGPT Subscription")).toContain("mask:url(/logos/openai.svg)");
  });

  it("loads the logo with the page: a lazy image in a table on /hosts stayed blank until the page scrolled", () => {
    for (const html of [lab("google", "Google"), host("amazon-bedrock", "AWS - Bedrock")]) {
      expect(html).not.toContain("<img");
    }
  });

  it("falls back to a monogram when there is no logo", () => {
    expect(lab(null, "Other")).toMatch(/>Ot<\/span>$/);
    expect(host("databricks", "Databricks")).toMatch(/>Da<\/span>$/);
  });

  it("is hidden from screen readers, since the name always sits next to it", () => {
    for (const html of [lab("openai", "OpenAI"), lab("google", "Google"), host("databricks", "Databricks")]) {
      expect(html).toMatch(/^<span aria-hidden="true"/);
    }
  });

  it("draws each cloud's own logo", () => {
    const cloud = (id: string, name: string) => renderToStaticMarkup(createElement(CloudMark, { id, name }));
    expect(cloud("aws", "AWS")).toContain("mask:url(/logos/aws.svg)");
    expect(cloud("azure", "Microsoft Azure")).toContain("background:url(/logos/azure.svg)");
    expect(cloud("google-cloud", "Google Cloud")).toContain("background:url(/logos/googlecloud.svg)");
  });

  it("keeps a monogram readable on the smallest tiles", () => {
    const sized = (size: number) => renderToStaticMarkup(createElement(HostMark, { slug: "databricks", name: "Databricks", size }));
    expect(sized(20)).toContain("font-size:10px");
    expect(sized(44)).toContain("font-size:18px");
  });
});
