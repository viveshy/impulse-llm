import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { clsx } from "@/lib/utils/clsx";

export function Section({
  id,
  title,
  description,
  action,
  children,
  className,
}: {
  id?: string;
  title: ReactNode;
  description?: ReactNode;
  action?: { href: string; label: string };
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={clsx("scroll-mt-24", className)}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
        <div className="min-w-0">
          <h2 id={id ? `${id}-title` : undefined} className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
            {title}
          </h2>
          {description && <p className="mt-1 max-w-[70ch] text-[14.5px] text-ink-3">{description}</p>}
        </div>
        {action && (
          <Link
            href={action.href}
            className="group inline-flex items-center gap-1 text-[14px] font-medium text-accent hover:underline"
          >
            {action.label}
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** A white card on the page background. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx("rounded-[12px] border border-border bg-panel shadow-[var(--shadow)]", className)}>
      {children}
    </div>
  );
}
