import Link from "next/link";
import type { Provider } from "@/lib/domain/types";
import { ProviderGlyph } from "@/components/common/ProviderGlyph";

const CATEGORY_LABEL: Record<Provider["category"], string> = {
  frontier: "Frontier lab",
  open: "Open weights",
  cloud: "Cloud platform",
  inference: "Inference provider",
};

export function ProviderCard({ provider, modelCount }: { provider: Provider; modelCount: number }) {
  return (
    <Link
      href={`/app/providers/${provider.id}`}
      className="flex items-start gap-[12px] rounded-[10px] border border-border bg-panel p-[16px] transition-colors hover:border-border-strong hover:bg-hover"
    >
      <ProviderGlyph monogram={provider.monogram} size="md" />
      <div className="min-w-0">
        <div className="text-[15px] font-medium text-ink">{provider.name}</div>
        <div className="mt-[3px] text-[13px] text-ink-4">{CATEGORY_LABEL[provider.category]}</div>
        <div className="mt-[10px] text-[15px] text-ink-3">
          {modelCount} model{modelCount === 1 ? "" : "s"}
        </div>
      </div>
    </Link>
  );
}
