import Link from "next/link";
import { formatCount } from "@/lib/utils/format";
import { Container } from "./Container";
import { LogoMark } from "./Logo";

const COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/models", label: "Models" },
      { href: "/releases", label: "Releases" },
      { href: "/retiring", label: "Retiring" },
      { href: "/watchlist", label: "Watchlist" },
      { href: "/compare", label: "Compare" },
      { href: "/calculator", label: "Cost calculator" },
    ],
  },
  {
    title: "Directory",
    links: [
      { href: "/labs", label: "Labs" },
      { href: "/clouds", label: "Clouds" },
      { href: "/hosts", label: "Hosts" },
      { href: "/stats", label: "Site stats" },
      { href: "/releases/feed.xml", label: "Releases RSS" },
    ],
  },
];

function updatedAgo(iso: string | undefined, now: number): string | null {
  if (!iso) return null;
  const minutes = Math.round((now - Date.parse(iso)) / 60_000);
  if (Number.isNaN(minutes)) return null;
  if (minutes < 60) return `${Math.max(1, minutes)} min ago`;
  const hours = Math.round(minutes / 60);
  return hours < 48 ? `${hours} h ago` : `${Math.round(hours / 24)} days ago`;
}

export function SiteFooter({
  visits30d,
  generatedAt,
  now,
}: {
  visits30d: number | null;
  generatedAt?: string;
  now: number;
}) {
  const ago = updatedAgo(generatedAt, now);
  return (
    <footer className="mt-20 border-t border-border bg-panel">
      <Container className="grid gap-10 py-10 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-[380px]">
          <div className="flex items-center gap-[9px]">
            <LogoMark size={22} />
            <span className="text-[16px] font-semibold tracking-[-0.03em]">impulse</span>
          </div>
          <p className="mt-3 text-[14px] text-ink-3">
            The frontier model desk: what the big labs ship, what it costs on every host, and what is about to be
            retired. Prices and specs come from LiteLLM&rsquo;s model map, OpenRouter and Hugging Face, refreshed every
            6 hours.
          </p>
          {ago && <p className="mt-3 text-[13px] text-ink-3">Catalog updated {ago}.</p>}
          <p className="mt-3 text-[13px] text-ink-3">
            Logos from{" "}
            <a
              href="https://github.com/lobehub/lobe-icons"
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-ink"
            >
              LobeHub Icons
            </a>
            . Names and logos belong to their owners.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h2 className="text-[13px] font-medium text-ink-3">{col.title}</h2>
            <ul className="mt-3 space-y-2">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-[14px] text-ink-2 hover:text-ink hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </Container>
      <div className="border-t border-border-2">
        <Container className="flex flex-wrap items-center justify-between gap-2 py-4 text-[13px] text-ink-3">
          {visits30d !== null ? (
            <Link href="/stats" className="hover:text-ink hover:underline">
              {formatCount(visits30d)} visits in the last 30 days
            </Link>
          ) : (
            <span />
          )}
          <span>No cookies. Prices are list prices in USD per million tokens.</span>
        </Container>
      </div>
    </footer>
  );
}
