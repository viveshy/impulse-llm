import { Chip } from "./Chip";

/** Server-rendered filter chips that write one search param. */
export function ParamChips<T extends string>({
  base,
  param,
  value,
  options,
  extra,
}: {
  base: string;
  param: string;
  value: T;
  options: { id: T; label: string; count?: number }[];
  /** Other params to keep. */
  extra?: Record<string, string | undefined>;
}) {
  const href = (id: T, isDefault: boolean) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(extra ?? {})) if (v) sp.set(k, v);
    if (!isDefault) sp.set(param, id);
    const qs = sp.toString();
    return qs ? `${base}?${qs}` : base;
  };
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o, i) => (
        <Chip key={o.id} href={href(o.id, i === 0)} active={o.id === value} count={o.count}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}
