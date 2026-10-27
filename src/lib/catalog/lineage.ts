/**
 * Model lines and versions. `claude-opus-5-5` is version 5.5 of the line `claude-opus`;
 * `claude-3-5-sonnet` and `claude-sonnet-4-5` share the line `claude-sonnet`. The newest
 * model in a line is its head; every older model points at it as its successor.
 */
import type { CanonicalModel } from "./types";

const DIGITS = /^\d+$/;

export function lineAndVersion(key: string): { line: string; version: number[] } {
  const tokens = key.split("-").filter(Boolean);
  const glued = tokens[0]?.match(/^([a-z]+)(\d+)$/); // o3, qwen3, veo3
  if (glued) tokens.splice(0, 1, glued[1], glued[2]);

  const version: number[] = [];
  const line: string[] = [];
  let state: "before" | "in" | "after" = "before";
  tokens.forEach((t, i) => {
    let v: number | null = null;
    if (state !== "after") {
      if (DIGITS.test(t)) v = Number(t);
      else if (state === "before" && /^v\d+$/.test(t)) v = Number(t.slice(1)); // deepseek-v3
      else if (state === "before" && i === 1 && /^[a-z]\d+$/.test(t)) {
        // kimi-k3, deepseek-r1: the letter stays in the line
        line.push(t[0]);
        v = Number(t.slice(1));
      }
    }
    if (v !== null) {
      version.push(v);
      state = "in";
    } else {
      if (state === "in") state = "after";
      line.push(t);
    }
  });
  return { line: line.join("-"), version };
}

export function compareVersions(a: number[], b: number[]): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? 0) - (b[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Newer first: by release date where both are dated, else by version. */
function newer(a: CanonicalModel, b: CanonicalModel): number {
  if (a.releaseDate && b.releaseDate && a.releaseDate !== b.releaseDate) {
    return a.releaseDate < b.releaseDate ? 1 : -1;
  }
  return compareVersions(b.version, a.version);
}

function headOf(members: CanonicalModel[]): CanonicalModel {
  const pool = members.some((m) => !m.preview) ? members.filter((m) => !m.preview) : members;
  const dated = pool.filter((m) => m.releaseDate);
  if (dated.length === 0) return [...pool].sort(newer)[0];
  const latestDated = [...dated].sort(newer)[0];
  // An undated model with a higher version than the newest dated one is newer still.
  const undatedNewer = pool
    .filter((m) => !m.releaseDate && compareVersions(m.version, latestDated.version) > 0)
    .sort((a, b) => compareVersions(b.version, a.version));
  return undatedNewer[0] ?? latestDated;
}

export function isRetired(m: Pick<CanonicalModel, "status" | "deprecationDate">, today: string): boolean {
  return m.status === "deprecated" || (!!m.deprecationDate && m.deprecationDate <= today);
}

/** Sets successorSlug, predecessorSlugs and isCurrent on every model, in place. */
export function assignLineage(models: CanonicalModel[], today: string): void {
  const lines = new Map<string, CanonicalModel[]>();
  for (const m of models) {
    const id = `${m.labId ?? "?"}|${m.kind}|${m.line}`;
    const list = lines.get(id) ?? [];
    list.push(m);
    lines.set(id, list);
  }

  for (const members of lines.values()) {
    // Only versioned models take part; a version-less alias (`gemini-pro`) stands alone.
    const versioned = members.filter((m) => m.version.length > 0);
    const head = versioned.length > 1 ? headOf(versioned) : null;
    const ordered = [...versioned].sort(newer);
    for (const m of members) {
      const inLine = head !== null && versioned.includes(m);
      m.successorSlug =
        inLine && head !== m && (!m.preview || head.preview || newer(head, m) < 0) ? head.slug : undefined;
      m.predecessorSlugs = inLine ? ordered.slice(ordered.indexOf(m) + 1).map((p) => p.slug) : [];
      m.isCurrent = !m.successorSlug && !isRetired(m, today);
    }
  }
}
