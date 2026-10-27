import { describe, expect, it } from "vitest";
import { filterHref, parseModelFilter } from "../model-filters";

describe("parseModelFilter", () => {
  it("reads known values", () => {
    expect(
      parseModelFilter({ tier: "open", lab: "meta", kind: "all", q: " llama ", sort: "price", retired: "1", page: "3" }),
    ).toEqual({ tier: "open", lab: "meta", kind: "all", q: "llama", sort: "price", includeRetired: true, page: 3 });
  });

  it("ignores junk and keeps the defaults", () => {
    expect(parseModelFilter({ tier: "best", kind: "toaster", sort: "random", page: "-2", lab: "<x>" })).toEqual({
      page: 1,
    });
  });

  it("takes the first of repeated params", () => {
    expect(parseModelFilter({ tier: ["open", "frontier"] }).tier).toBe("open");
  });
});

describe("filterHref", () => {
  it("drops defaults and empty values", () => {
    expect(filterHref({ page: 1 }, { q: "" })).toBe("/models");
    expect(filterHref({ page: 1 }, { tier: "open" })).toBe("/models?tier=open");
  });

  it("resets the page when a filter changes", () => {
    expect(filterHref({ tier: "open", page: 4 }, { sort: "price" })).toBe("/models?tier=open&sort=price");
  });

  it("keeps the page when only the page changes", () => {
    expect(filterHref({ tier: "open", page: 1 }, { page: 2 })).toBe("/models?tier=open&page=2");
  });

  it("encodes search text", () => {
    expect(filterHref({ page: 1 }, { q: "gpt 6.1" })).toBe("/models?q=gpt+6.1");
  });
});
