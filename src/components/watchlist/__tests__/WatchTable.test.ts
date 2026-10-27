import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { model, provider, TODAY } from "@/lib/catalog/__tests__/helpers";
import { buildIndex } from "@/lib/catalog/group";
import { watchRows } from "@/lib/catalog/watch";
import type { WatchItem } from "@/lib/watchlist";
import { WatchTable } from "@/components/watchlist/WatchTable";

const index = buildIndex(
  [
    model({ id: "o-mini", name: "gpt-5.4-mini", providerId: "o", releaseDate: "2026-03-17", deprecationDate: "2026-11-01" }),
    model({ id: "o-gpt55", name: "gpt-5.5", providerId: "o", releaseDate: "2026-04-01" }),
    model({ id: "o-gpt55-d", name: "gpt-5.5-2026-04-01", providerId: "o", releaseDate: "2026-04-01" }),
  ],
  [provider("o", "OpenAI", "frontier")],
  { now: TODAY },
);
const items: WatchItem[] = [
  { model: "gpt-5-4-mini", host: "openai" },
  { model: "gpt-5-5", host: "openai" },
];
const html = renderToStaticMarkup(createElement(WatchTable, { rows: watchRows(index, items), items }));
/** What phones show under each model's name. */
const phone = html
  .split('class="mt-2 space-y-2 sm:hidden"')
  .slice(1)
  .map((s) => s.split("</td>")[0]);

describe("WatchTable", () => {
  it("points a retiring model with nothing newer at its alternatives", () => {
    expect(html).toContain('href="/models/openai/gpt-5-4-mini#alternatives"');
    expect(html).toContain("See alternatives");
  });

  it("leaves missing values out of the phone layout rather than showing a lone dash", () => {
    expect(phone).toHaveLength(2);
    for (const block of phone) expect(block).not.toContain(">-<");
  });

  it("lets a long API id break anywhere, but not the words after it", () => {
    expect(html).toMatch(/<code class="[^"]*break-all[^"]*">gpt-5\.5[^<]*<\/code>/);
    expect(html).not.toMatch(/<div class="[^"]*break-all[^"]*"><code/);
    expect(html).toContain("all 2 listings");
  });
});
