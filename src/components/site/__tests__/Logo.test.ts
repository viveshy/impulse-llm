import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LogoMark } from "@/components/site/Logo";

const mark = renderToStaticMarkup(createElement(LogoMark));
const favicon = readFileSync(new URL("../../../app/icon.svg", import.meta.url), "utf8");

/** Every path, circle and line in an SVG, as "kind:geometry", sorted. */
function shapes(svg: string) {
  const attr = (tag: string, name: string) => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1];
  return [...svg.matchAll(/<(path|circle|line)\b[^>]*>/g)]
    .map(([tag, kind]) => {
      const keys = kind === "path" ? ["d"] : kind === "circle" ? ["cx", "cy", "r"] : ["x1", "y1", "x2", "y2"];
      return `${kind}:${keys.map((k) => attr(tag, k)).join(",")}`;
    })
    .sort();
}

describe("LogoMark", () => {
  it("is the same mark as the favicon", () => {
    expect(shapes(mark).length).toBeGreaterThan(0);
    expect(shapes(favicon)).toEqual(shapes(mark));
  });

  it("draws in theme colours, so it follows dark mode, and stays out of the accessibility tree", () => {
    expect(mark).toContain('aria-hidden="true"');
    expect(mark).toContain('fill="var(--accent)"');
    expect(mark).toContain("var(--accent-ink)");
  });
});
