/** `table[key]` for the table's own keys only: a key from a link can be "constructor" or "__proto__". */
export const own = <V>(table: Readonly<Record<string, V>>, key: string): V | undefined =>
  Object.hasOwn(table, key) ? table[key] : undefined;
