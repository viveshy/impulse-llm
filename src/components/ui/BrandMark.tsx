import { cloudBrand, hostBrand, isMono, labBrand, logoSrc, type Brand } from "@/lib/brands";
import { clsx } from "@/lib/utils/clsx";

/**
 * A logo on a small tile, or a two-letter monogram when we have no logo. Decorative: the name always sits beside it.
 * The logo is a CSS background or mask rather than an image, so it loads with the page; a lazy image inside a
 * table stayed blank until the page scrolled.
 */
function BrandMark({ brand, name, size, className }: { brand?: Brand; name: string; size: number; className?: string }) {
  const inner = Math.round(size * 0.62);
  const logo = brand && `url(${logoSrc(brand)}) center / contain no-repeat`;
  const text = name.replace(/[^A-Za-z0-9]/g, "").slice(0, 2) || "?";
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, ...(brand ? {} : { fontSize: Math.max(10, Math.round(size * 0.42)) }) }}
      className={clsx(
        "grid flex-none place-items-center rounded-[8px] border border-border bg-panel",
        brand ? "text-ink" : "font-semibold tracking-[-0.03em] text-ink-2",
        className,
      )}
    >
      {!brand ? (
        text
      ) : isMono(brand) ? (
        // One-colour marks take the text colour, so they read in both themes.
        <span className="block bg-current" style={{ width: inner, height: inner, mask: logo, WebkitMask: logo }} />
      ) : (
        <span className="block" style={{ width: inner, height: inner, background: logo }} />
      )}
    </span>
  );
}

export function LabMark({ labId, name, size = 28, className }: { labId: string | null; name: string; size?: number; className?: string }) {
  return <BrandMark brand={labBrand(labId)} name={name} size={size} className={className} />;
}

export function HostMark({ slug, name, size = 28, className }: { slug: string; name: string; size?: number; className?: string }) {
  return <BrandMark brand={hostBrand(slug)} name={name} size={size} className={className} />;
}

export function CloudMark({ id, name, size = 28, className }: { id: string; name: string; size?: number; className?: string }) {
  return <BrandMark brand={cloudBrand(id)} name={name} size={size} className={className} />;
}
