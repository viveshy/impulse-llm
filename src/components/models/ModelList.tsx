import type { Model } from "@/lib/domain/types";
import { ModelRow, ROW_GRID } from "./ModelRow";

function ColumnHeader() {
  return (
    <div
      className={`${ROW_GRID} h-8 flex-none border-b border-border text-[12px] uppercase tracking-[0.1em] text-ink-4`}
    >
      <span>Model</span>
      <span>Provider</span>
      <span className="text-right">Context</span>
      <span className="text-right">Input</span>
      <span className="text-right">Output</span>
      <span>Capabilities</span>
    </div>
  );
}

export function ModelList({
  models,
  providerName,
}: {
  models: Model[];
  providerName: Map<string, string>;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ColumnHeader />
      <div className="min-h-0 flex-1 overflow-y-auto">
        {models.length === 0 ? (
          <div className="px-5 py-16 text-center text-[15px] text-ink-4">
            No models match these filters.
          </div>
        ) : (
          models.map((m) => (
            <ModelRow key={m.id} model={m} providerName={providerName.get(m.providerId) ?? m.providerId} />
          ))
        )}
      </div>
    </div>
  );
}
