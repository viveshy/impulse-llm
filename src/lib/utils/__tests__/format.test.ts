import { describe, expect, it } from "vitest";
import { formatAgo, formatCompact, formatDate, formatDaysLeft, formatMoney, formatMultiple, formatTokens, formatUsd, wholeSentences } from "../format";

describe("formatUsd (per-million prices)", () => {
  it("keeps two decimals at a dollar and above", () => {
    expect(formatUsd(15)).toBe("$15.00");
    expect(formatUsd(1.25)).toBe("$1.25");
  });
  it("shows the digits that matter below a dollar", () => {
    expect(formatUsd(0.1)).toBe("$0.10");
    expect(formatUsd(0.075)).toBe("$0.075");
    expect(formatUsd(0.0375)).toBe("$0.0375");
  });
  it("drops cents at a thousand and above", () => {
    expect(formatUsd(1500)).toBe("$1,500");
  });
  it("marks a missing price", () => {
    expect(formatUsd(null)).toBe("-");
    expect(formatUsd(undefined)).toBe("-");
  });
});

describe("formatMoney (monthly totals)", () => {
  it("rounds to whole dollars from $100", () => {
    expect(formatMoney(12345.6)).toBe("$12,346");
  });
  it("keeps cents below $100", () => {
    expect(formatMoney(42.5)).toBe("$42.50");
  });
  it("never shows a non-zero cost as zero", () => {
    expect(formatMoney(0.001)).toBe("<$0.01");
    expect(formatMoney(0)).toBe("$0");
  });
});

describe("formatTokens", () => {
  it("rounds a binary million to 1M", () => {
    expect(formatTokens(1_048_576)).toBe("1M");
    expect(formatTokens(2_000_000)).toBe("2M");
    expect(formatTokens(1_500_000)).toBe("1.5M");
    expect(formatTokens(200_000)).toBe("200K");
  });
});

describe("dates", () => {
  it("formats an ISO day", () => {
    expect(formatDate("2026-10-26")).toBe("26 Oct 2026");
    expect(formatDate("2026-10-26T08:00:00Z")).toBe("26 Oct 2026");
  });
  it("says how long ago", () => {
    expect(formatAgo("2026-10-26", "2026-10-26")).toBe("today");
    expect(formatAgo("2026-10-25", "2026-10-26")).toBe("yesterday");
    expect(formatAgo("2026-10-20", "2026-10-26")).toBe("6 days ago");
    expect(formatAgo("2026-10-05", "2026-10-26")).toBe("3 weeks ago");
    expect(formatAgo("2026-06-01", "2026-10-26")).toBe("Jun 2026");
  });
  it("says how long until", () => {
    expect(formatDaysLeft(0)).toBe("today");
    expect(formatDaysLeft(1)).toBe("tomorrow");
    expect(formatDaysLeft(12)).toBe("in 12 days");
    expect(formatDaysLeft(-3)).toBe("3 days ago");
  });
});

describe("formatMultiple", () => {
  it("keeps one decimal below ten and none above", () => {
    expect(formatMultiple(1)).toBe("1.0×");
    expect(formatMultiple(2.345)).toBe("2.3×");
    expect(formatMultiple(12.6)).toBe("13×");
    expect(formatMultiple(1234)).toBe("1,234×");
  });
});

describe("formatCompact", () => {
  it("shortens counts from a thousand up", () => {
    expect(formatCompact(0)).toBe("0");
    expect(formatCompact(950)).toBe("950");
    expect(formatCompact(1000)).toBe("1K");
    expect(formatCompact(1500)).toBe("1.5K");
    expect(formatCompact(12_900)).toBe("12.9K");
    expect(formatCompact(2_500_000)).toBe("2.5M");
  });
});

describe("wholeSentences", () => {
  it("cuts a truncated description back to its last full sentence", () => {
    expect(
      wholeSentences(
        "Claude Opus 5.5 is Anthropic's flagship model for demanding reasoning, coding, and long-horizon agentic work, succeeding Claude Opus 5. It is particularly strong at multi-step changes in large codebases, code...",
      ),
    ).toBe(
      "Claude Opus 5.5 is Anthropic's flagship model for demanding reasoning, coding, and long-horizon agentic work, succeeding Claude Opus 5.",
    );
  });

  it("does not take a version number or an abbreviation for the end of a sentence", () => {
    expect(
      wholeSentences(
        "Claude Haiku 5.5 is Anthropic's small, fast model for high-volume work. It handles e.g. tagging and other cost-sensitive work such as…",
      ),
    ).toBe("Claude Haiku 5.5 is Anthropic's small, fast model for high-volume work.");
  });

  it("keeps a description with no full sentence to fall back to, with a proper ellipsis", () => {
    expect(wholeSentences("GPT-6.1 Sol is an upgrade to GPT-6 Sol from OpenAI, positioned below GPT-6 Astra in the GP...")).toBe(
      "GPT-6.1 Sol is an upgrade to GPT-6 Sol from OpenAI, positioned below GPT-6 Astra in the GP…",
    );
    expect(wholeSentences("Fast. A model that does many things and then some more things...")).toBe(
      "Fast. A model that does many things and then some more things…",
    );
  });

  it("leaves a complete description alone", () => {
    expect(wholeSentences("A complete description. Two sentences.")).toBe("A complete description. Two sentences.");
    expect(wholeSentences("")).toBe("");
  });
});
