import { ExternalLink } from "lucide-react";
import type { CanonicalModel } from "@/lib/catalog/types";

const LITELLM_MAP = "https://github.com/BerriAI/litellm/blob/main/model_prices_and_context_window.json";

export function Sources({ model, spec }: { model: CanonicalModel; spec?: Record<string, unknown> }) {
  const pages = new Map<string, string>();
  for (const l of model.listings) if (l.sourceUrl && /^https:\/\//.test(l.sourceUrl) && !pages.has(l.host.name)) pages.set(l.host.name, l.sourceUrl);
  return (
    <div className="space-y-3">
      <ul className="flex flex-wrap gap-2 text-[14px]">
        {[...pages].map(([host, url]) => (
          <li key={host}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-panel px-3 py-1 text-ink-2 hover:border-border-strong hover:text-ink"
            >
              {host} pricing <ExternalLink size={12} />
            </a>
          </li>
        ))}
        <li>
          <a
            href={LITELLM_MAP}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-full border border-border bg-panel px-3 py-1 text-ink-2 hover:border-border-strong hover:text-ink"
          >
            LiteLLM model map <ExternalLink size={12} />
          </a>
        </li>
      </ul>
      {spec && (
        <details className="rounded-[12px] border border-border bg-panel">
          <summary className="cursor-pointer px-4 py-3 text-[14px] font-medium text-ink-2 hover:text-ink">
            Raw catalog entry for {model.reference.apiModelId} on {model.reference.host.name}
          </summary>
          <pre className="max-h-[480px] overflow-auto border-t border-border bg-sunken px-4 py-3 font-mono text-[12.5px] leading-[1.6] text-ink-2">
            {JSON.stringify(spec, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
