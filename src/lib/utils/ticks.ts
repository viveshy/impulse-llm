/** Axis ticks from zero: about `target` round steps that cover `max`. Counts are whole, so steps never go below 1. */
export function niceTicks(max: number, target = 4): number[] {
  if (!(max > 0)) return [0, 1];
  const raw = max / target;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = Math.max(
    1,
    [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw && (s >= 10 || Number.isInteger(s) || s < 1))!,
  );
  const ticks: number[] = [];
  for (let v = 0; v < max + step; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return ticks;
}
