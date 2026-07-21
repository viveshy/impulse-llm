"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AuthType, Model, Provider } from "@/lib/domain/types";
import { apiExample } from "@/lib/api-examples";
import { clsx } from "@/lib/utils/clsx";
import { CodeBlock } from "@/components/common/CodeBlock";
import { SearchField } from "@/components/common/SearchField";
import { SectionLabel } from "@/components/common/Panel";

const AUTH_LABEL: Record<AuthType, string> = {
  "api-key": "API key",
  bearer: "Bearer token",
  oauth: "OAuth",
  "aws-sigv4": "AWS SigV4",
};

export function ApiExplorer({ providers, models }: { providers: Provider[]; models: Model[] }) {
  const first = providers.find((p) => p.endpoints.length > 0) ?? providers[0];
  const [sel, setSel] = useState<{ p: string; e: string }>({
    p: first?.id ?? "",
    e: first?.endpoints[0]?.id ?? "",
  });

  const [search, setSearch] = useState("");

  // rail is 100+ providers deep - filter it by name/category so it stays navigable
  const railProviders = useMemo(() => {
    const withEndpoints = providers.filter((p) => p.endpoints.length > 0);
    const needle = search.trim().toLowerCase();
    return needle
      ? withEndpoints.filter((p) => `${p.name} ${p.category}`.toLowerCase().includes(needle))
      : withEndpoints;
  }, [providers, search]);

  const provider = providers.find((p) => p.id === sel.p) ?? first;
  const endpoint = provider?.endpoints.find((e) => e.id === sel.e) ?? provider?.endpoints[0];

  const supported = useMemo(
    () =>
      endpoint && provider
        ? models.filter((m) => m.providerId === provider.id && m.endpointIds.includes(endpoint.id))
        : [],
    [models, provider, endpoint],
  );

  const example = useMemo(
    () => (provider && endpoint ? apiExample(provider, endpoint, supported[0] ?? null) : null),
    [provider, endpoint, supported],
  );

  return (
    <div className="flex min-h-0 flex-1">
      {/* endpoint rail */}
      <div className="flex w-[300px] flex-none flex-col border-r border-border">
        <div className="flex-none border-b border-border p-[10px]">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search providers…"
            className="w-full"
          />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
        {railProviders.length === 0 && (
          <div className="px-4 py-6 text-[14px] text-ink-4">No providers match “{search}”.</div>
        )}
        {railProviders.map((p) => (
            <div key={p.id} className="py-2">
              <div className="px-4 py-[6px] text-[11px] uppercase tracking-[0.12em] text-ink-4">
                {p.name}
              </div>
              {p.endpoints.map((e) => {
                const active = p.id === sel.p && e.id === sel.e;
                return (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setSel({ p: p.id, e: e.id })}
                    className={clsx(
                      "relative flex w-full items-center gap-[9px] px-4 py-[7px] text-left transition-colors",
                      active ? "bg-hover" : "hover:bg-hover",
                    )}
                  >
                    {active && <span className="absolute bottom-[7px] left-0 top-[7px] w-[2px] rounded-[2px] bg-accent" />}
                    <span className="w-[38px] flex-none text-[10px] uppercase tracking-[0.04em] text-ink-4">
                      {e.method}
                    </span>
                    <span className={clsx("truncate text-[13px]", active ? "text-ink" : "text-ink-2")}>
                      {e.path}
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* detail */}
      <div className="min-w-0 flex-1 overflow-y-auto px-6 pb-12 pt-[22px]">
        {provider && endpoint && example && (
          <div className="flex max-w-[820px] flex-col gap-6">
            <div>
              <div className="flex items-center gap-[10px]">
                <span className="rounded-[5px] border border-border-strong px-[8px] py-[2px] text-[12px] tracking-[0.04em] text-ink-2">
                  {endpoint.method}
                </span>
                <span className="text-[16px] text-ink">{endpoint.path}</span>
              </div>
              <div className="mt-[10px] text-[16px] font-medium text-ink">{endpoint.name}</div>
              <p className="mt-[6px] max-w-[70ch] text-[14px] leading-[1.6] text-ink-3">
                {endpoint.description}
              </p>
              <div className="mt-[14px] flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-3">
                <span>
                  Provider{" "}
                  <Link href={`/app/providers/${provider.id}`} className="text-accent hover:underline">
                    {provider.name}
                  </Link>
                </span>
                <span>
                  Auth <span className="text-ink">{AUTH_LABEL[provider.authType]}</span>
                </span>
                <span>
                  Streaming <span className="text-ink">{endpoint.streaming ? "Supported" : "No"}</span>
                </span>
              </div>
            </div>

            {supported.length > 0 && (
              <div>
                <SectionLabel>Supported models · {supported.length}</SectionLabel>
                <div className="flex flex-wrap gap-[6px]">
                  {supported.slice(0, 16).map((m) => (
                    <Link
                      key={m.id}
                      href={`/app/models/${m.id}`}
                      className="rounded-[6px] border border-border px-[9px] py-[4px] text-[13px] text-ink-2 transition-colors hover:border-border-strong hover:text-ink"
                    >
                      {m.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <CodeBlock label="Example request" code={example.curl} />
              <CodeBlock label="Example response" code={example.response} />
              <CodeBlock label="Python" code={example.python} />
              <CodeBlock label="TypeScript" code={example.typescript} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
