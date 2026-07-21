type ClassValue = string | number | null | false | undefined;

/** Minimal className joiner. */
export function clsx(...values: ClassValue[]): string {
  return values.filter(Boolean).join(" ");
}
