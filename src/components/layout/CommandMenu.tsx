"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Boxes, Building2, CornerDownLeft, FileText, Search, Server } from "lucide-react";
import type { SearchRow } from "@/lib/catalog/select";
import { loadSearchIndex, normQuery as norm, rankModels, type SearchIndex } from "@/lib/search";
import { formatReleaseDate } from "@/lib/utils/format";
import { useCommandMenu } from "./command-menu-context";

const PAGES = [
  { href: "/models", label: "All models" },
  { href: "/releases", label: "Releases" },
  { href: "/retiring", label: "Retiring soon" },
  { href: "/compare", label: "Compare models" },
  { href: "/calculator", label: "Cost calculator" },
  { href: "/labs", label: "Labs" },
  { href: "/hosts", label: "Hosts" },
  { href: "/stats", label: "Site stats" },
];

const KIND_LABEL: Partial<Record<SearchRow["k"], string>> = {
  image: "Image",
  video: "Video",
  speech: "Speech",
  transcription: "Transcription",
  realtime: "Realtime",
  embedding: "Embedding",
  rerank: "Rerank",
  moderation: "Moderation",
  search: "Search",
  ocr: "OCR",
};

const groupClass =
  "[&_[cmdk-group-heading]]:px-[10px] [&_[cmdk-group-heading]]:pb-[5px] [&_[cmdk-group-heading]]:pt-[10px] [&_[cmdk-group-heading]]:text-[12.5px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-ink-3";

const itemClass =
  "flex min-h-[40px] cursor-pointer items-center gap-[11px] rounded-[8px] px-[10px] text-[15px] text-ink data-[selected=true]:bg-hover";

function ItemIcon({ children }: { children: React.ReactNode }) {
  return (
    <span className="grid h-[24px] w-[24px] flex-none place-items-center rounded-[6px] border border-border bg-sunken text-ink-3">
      {children}
    </span>
  );
}

export function CommandMenu() {
  const { open, setOpen } = useCommandMenu();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [data, setData] = useState<SearchIndex | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || data) return;
    let live = true;
    loadSearchIndex().then(
      (d) => live && setData(d),
      () => live && setFailed(true),
    );
    return () => {
      live = false;
    };
  }, [open, data]);

  const labName = useMemo(() => new Map((data?.labs ?? []).map((l) => [l.s, l.n])), [data]);
  const models = useMemo(() => (data ? rankModels(data.models, q) : []), [data, q]);
  const needle = norm(q);
  const pages = PAGES.filter((p) => !needle || norm(p.label).includes(needle));
  const labs = needle ? (data?.labs ?? []).filter((l) => norm(l.n).includes(needle)).slice(0, 5) : [];
  const hosts = needle ? (data?.hosts ?? []).filter((h) => norm(h.n).includes(needle)).slice(0, 5) : [];

  if (!open) return null;

  const close = () => {
    setOpen(false);
    setQ("");
  };
  const go = (href: string) => {
    close();
    router.push(href);
  };
  const nothing = data && !models.length && !pages.length && !labs.length && !hosts.length;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal aria-label="Search">
      <div className="absolute inset-0 bg-[rgba(17,17,19,0.45)] backdrop-blur-[2px]" onClick={close} />
      <Command
        label="Search"
        shouldFilter={false}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
        className="absolute left-1/2 top-[12vh] w-[min(600px,calc(100vw-24px))] -translate-x-1/2 overflow-hidden rounded-[14px] border border-border-strong bg-elevated shadow-[0_30px_80px_-24px_rgba(0,0,0,0.45)]"
      >
        <div className="flex items-center gap-[10px] border-b border-border px-[15px] py-[13px]">
          <Search size={17} className="flex-none text-ink-3" />
          <Command.Input
            autoFocus
            value={q}
            onValueChange={setQ}
            placeholder="Search models, labs, hosts…"
            className="flex-1 bg-transparent text-[17px] tracking-[-0.01em] text-ink !outline-none placeholder:text-ink-4"
          />
          <kbd className="rounded-[4px] border border-border px-[6px] py-px font-sans text-[12px] text-ink-3">esc</kbd>
        </div>

        <Command.List className="max-h-[56vh] overflow-y-auto p-[6px]">
          {!data && !failed && <div className="px-[10px] py-6 text-center text-[14.5px] text-ink-3">Loading the catalog…</div>}
          {failed && (
            <div className="px-[10px] py-6 text-center text-[14.5px] text-ink-3">Search is unavailable right now.</div>
          )}
          {nothing && <div className="px-[10px] py-6 text-center text-[14.5px] text-ink-3">No results for “{q}”.</div>}

          {models.length > 0 && (
            <Command.Group heading={needle ? "Models" : "Latest frontier models"} className={groupClass}>
              {models.map((m) => (
                <Command.Item
                  key={`${m.l}/${m.s}`}
                  value={`${m.l}/${m.s}`}
                  onSelect={() => go(`/models/${m.l}/${m.s}`)}
                  className={itemClass}
                >
                  <ItemIcon>
                    <Boxes size={13} />
                  </ItemIcon>
                  <span className="min-w-0 truncate">{m.n}</span>
                  {KIND_LABEL[m.k] && <span className="text-[12.5px] text-ink-3">{KIND_LABEL[m.k]}</span>}
                  <span className="ml-auto whitespace-nowrap text-[13px] text-ink-3">
                    {labName.get(m.l) ?? m.l}
                    {m.r ? ` · ${formatReleaseDate(m.r)}` : ""}
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {labs.length > 0 && (
            <Command.Group heading="Labs" className={groupClass}>
              {labs.map((l) => (
                <Command.Item key={l.s} value={`lab:${l.s}`} onSelect={() => go(`/labs/${l.s}`)} className={itemClass}>
                  <ItemIcon>
                    <Building2 size={13} />
                  </ItemIcon>
                  <span>{l.n}</span>
                  <span className="ml-auto text-[13px] text-ink-3">{l.c} models</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {hosts.length > 0 && (
            <Command.Group heading="Hosts" className={groupClass}>
              {hosts.map((h) => (
                <Command.Item key={h.s} value={`host:${h.s}`} onSelect={() => go(`/hosts/${h.s}`)} className={itemClass}>
                  <ItemIcon>
                    <Server size={13} />
                  </ItemIcon>
                  <span>{h.n}</span>
                  <span className="ml-auto text-[13px] text-ink-3">{h.c} models</span>
                </Command.Item>
              ))}
            </Command.Group>
          )}

          {pages.length > 0 && (
            <Command.Group heading="Pages" className={groupClass}>
              {pages.map((p) => (
                <Command.Item key={p.href} value={`page:${p.href}`} onSelect={() => go(p.href)} className={itemClass}>
                  <ItemIcon>
                    <FileText size={13} />
                  </ItemIcon>
                  <span>{p.label}</span>
                  <CornerDownLeft size={12} className="ml-auto text-ink-4" />
                </Command.Item>
              ))}
            </Command.Group>
          )}
        </Command.List>

        <div className="hidden gap-4 border-t border-border px-[14px] py-[9px] text-[13px] text-ink-3 sm:flex">
          <span>↑↓ to move</span>
          <span>↵ to open</span>
          <span>esc to close</span>
        </div>
      </Command>
    </div>
  );
}
