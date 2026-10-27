import Link from "next/link";
import { clsx } from "@/lib/utils/clsx";

/**
 * The impulse mark: three inputs firing into a spark, a neuron's impulse and the sign for AI in one, in a rounded
 * square. src/app/icon.svg draws the same shapes for the favicon.
 */
export function LogoMark({ size = 24, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden className={clsx("flex-none", className)}>
      <rect width="24" height="24" rx="6.5" fill="var(--accent)" />
      <g stroke="var(--accent-ink)" strokeWidth="1.5" strokeLinecap="round">
        <line x1="4.8" y1="5.8" x2="14.8" y2="12" />
        <line x1="4.8" y1="12" x2="14.8" y2="12" />
        <line x1="4.8" y1="18.2" x2="14.8" y2="12" />
      </g>
      <g fill="var(--accent-ink)">
        <circle cx="4.8" cy="5.8" r="1.65" />
        <circle cx="4.8" cy="12" r="1.65" />
        <circle cx="4.8" cy="18.2" r="1.65" />
        <path d="M14.8 6.2C14.8 10.144 16.656 12 20.6 12C16.656 12 14.8 13.856 14.8 17.8C14.8 13.856 12.944 12 9 12C12.944 12 14.8 10.144 14.8 6.2Z" />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-[9px] rounded-[6px]" aria-label="impulse home">
      <LogoMark />
      <span className="text-[18px] font-semibold tracking-[-0.03em] text-ink">impulse</span>
    </Link>
  );
}
