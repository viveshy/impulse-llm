/** "AWS - Bedrock" → "aws-bedrock". */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "3.5.1" → "3-5-1": a dot between digits is a version separator. */
export function versionDotsToDashes(s: string): string {
  let out = s;
  while (/\d\.\d/.test(out)) out = out.replace(/(\d)\.(\d)/, "$1-$2");
  return out;
}
