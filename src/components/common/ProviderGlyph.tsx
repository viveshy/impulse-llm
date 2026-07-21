import { clsx } from "@/lib/utils/clsx";

const SIZES = {
  sm: "h-6 w-6 rounded-[6px] text-[13px]",
  md: "h-[30px] w-[30px] rounded-[7px] text-[15px]",
  lg: "h-[46px] w-[46px] rounded-[11px] text-[21px]",
} as const;

export function ProviderGlyph({
  monogram,
  size = "md",
  className,
}: {
  monogram: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "grid flex-none place-items-center border border-border-strong bg-panel font-semibold text-ink",
        SIZES[size],
        className,
      )}
      aria-hidden
    >
      {monogram}
    </span>
  );
}
