import { formatUsd } from "@/lib/utils/format";
import { clsx } from "@/lib/utils/clsx";

/** Input / output price per million tokens, as "$3.00 / $15.00". */
export function PricePair({
  input,
  output,
  className,
}: {
  input: number | null | undefined;
  output: number | null | undefined;
  className?: string;
}) {
  if ((input ?? 0) <= 0 && (output ?? 0) <= 0) return <span className={clsx("text-ink-4", className)}>Not listed</span>;
  return (
    <span className={clsx("whitespace-nowrap", className)}>
      <span className="text-ink">{formatUsd(input)}</span>
      <span className="text-ink-4"> / </span>
      <span className="text-ink">{formatUsd(output)}</span>
    </span>
  );
}

/** A saving or a premium against a reference price: "-42%" in green, "+8%" in red. */
export function Delta({ ratio, className }: { ratio: number; className?: string }) {
  const pct = Math.round(ratio * 100);
  if (pct === 0) return <span className={clsx("text-ink-3", className)}>same</span>;
  return (
    <span className={clsx("whitespace-nowrap font-medium", pct < 0 ? "text-ok" : "text-err", className)}>
      {pct < 0 ? "−" : "+"}
      {Math.abs(pct)}%
    </span>
  );
}
