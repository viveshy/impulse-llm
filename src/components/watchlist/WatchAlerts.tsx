"use client";

import { useState, type ReactNode } from "react";
import { CalendarDays, Check, Copy, Link2, Rss } from "lucide-react";

const button =
  "inline-flex h-9 items-center gap-[6px] whitespace-nowrap rounded-[8px] border border-border-strong bg-panel px-3 text-[14px] text-ink hover:bg-hover";

/** Copies an address on this site; the origin is read at click time, so it is right on any domain. */
function CopyUrl({ path, label }: { path: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      // clipboard blocked: nothing useful to do
    }
  };
  return (
    <button type="button" onClick={copy} className={button}>
      {copied ? <Check size={15} className="text-ok" aria-hidden /> : <Copy size={15} aria-hidden />}
      {copied ? "Copied" : label}
    </button>
  );
}

function Row({ icon, title, children, actions }: { icon: ReactNode; title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
      <div className="flex min-w-0 gap-3">
        <span className="mt-[2px] flex-none text-ink-3">{icon}</span>
        <div className="min-w-0">
          <div className="font-medium text-ink">{title}</div>
          <p className="text-[13.5px] text-ink-3">{children}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-8 md:flex-none md:pl-0">{actions}</div>
    </div>
  );
}

/** The list's link, and its calendar and RSS feeds. */
export function WatchAlerts({ w }: { w: string }) {
  const query = `?w=${w}`;
  const ics = `/watchlist/calendar.ics${query}`;
  const rss = `/watchlist/feed.xml${query}`;
  return (
    <section aria-labelledby="alerts-title" className="mt-10">
      <h2 id="alerts-title" className="text-[20px] font-semibold tracking-[-0.02em] text-ink">
        Share it and get alerts
      </h2>
      <div className="mt-4 divide-y divide-border-2 rounded-[12px] border border-border bg-panel shadow-[var(--shadow)]">
        <Row icon={<Link2 size={18} />} title="This list's link" actions={<CopyUrl path={`/watchlist${query}`} label="Copy link" />}>
          The list lives in the link: bookmark it, or share it with your team.
        </Row>
        <Row
          icon={<CalendarDays size={18} />}
          title="Calendar"
          actions={
            <>
              <button
                type="button"
                className={button}
                onClick={() => {
                  window.location.href = `webcal://${window.location.host}${ics}`;
                }}
              >
                Subscribe
              </button>
              <CopyUrl path={ics} label="Copy URL" />
              <a href={ics} download="impulse-watchlist.ics" className={button}>
                Download .ics
              </a>
            </>
          }
        >
          Each retirement as an all-day event. The file asks for reminders 30 and 7 days ahead, but Google Calendar
          ignores them and Apple Calendar drops them from subscriptions unless you keep alerts, so set your
          calendar&rsquo;s own notifications too. In Google Calendar, add it &ldquo;From URL&rdquo; with the copied
          address.
        </Row>
        <Row
          icon={<Rss size={18} />}
          title="RSS"
          actions={
            <>
              <CopyUrl path={rss} label="Copy URL" />
              <a href={rss} className={button}>
                Open feed
              </a>
            </>
          }
        >
          A post when a retirement comes within 90, 30 and 7 days, when a price moves and when a newer model is out.
          Works with Slack&rsquo;s RSS app, Teams and feed readers.
        </Row>
      </div>
    </section>
  );
}
