import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { showVisits, VISITS_SHOWN_ABOVE } from "@/lib/visits";
import { SiteFooter } from "../SiteFooter";

const footer = (visits30d: number | null) => renderToStaticMarkup(createElement(SiteFooter, { visits30d, now: 0 }));

describe("visit counts", () => {
  it("are shown only above the threshold", () => {
    expect(VISITS_SHOWN_ABOVE).toBe(50);
    expect(showVisits(null)).toBe(false);
    expect(showVisits(0)).toBe(false);
    expect(showVisits(50)).toBe(false);
    expect(showVisits(51)).toBe(true);
  });

  it("stay out of the footer until there are more than 50", () => {
    expect(footer(50)).not.toContain("visits in the last 30 days");
    expect(footer(null)).not.toContain("visits in the last 30 days");
    expect(footer(51)).toContain("51 visits in the last 30 days");
  });
});
