import { Check, Minus } from "lucide-react";
import { CAPABILITY_GROUPS, CAPABILITY_LABELS } from "@/lib/domain/capabilities";
import { effortsOf, featureLabels, MODALITY_LABEL as MODALITY, modalitiesOf } from "@/lib/catalog/capability-view";
import type { CanonicalModel } from "@/lib/catalog/types";
import { clsx } from "@/lib/utils/clsx";

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-sunken px-[9px] py-[2px] text-[13px] text-ink-2">
      {children}
    </span>
  );
}

export function Capabilities({ model }: { model: CanonicalModel }) {
  const has = new Set(model.capabilities);
  const io = modalitiesOf(model);
  const efforts = effortsOf(model);
  const features = featureLabels(model);
  const open = model.listings.find((l) => l.openWeights && (l.license || l.minVramGb || l.runtimes.length));
  return (
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <div className="grid gap-4 rounded-[12px] border border-border bg-panel p-4 shadow-[var(--shadow)] sm:grid-cols-3">
        {CAPABILITY_GROUPS.map((g) => (
          <div key={g.label}>
            <h3 className="text-[13px] font-medium text-ink-3">{g.label}</h3>
            <ul className="mt-2 space-y-[6px]">
              {g.keys.map((k) => (
                <li key={k} className={clsx("flex items-center gap-2 text-[14px]", has.has(k) ? "text-ink" : "text-ink-3")}>
                  {has.has(k) ? (
                    <Check size={15} className="flex-none text-ok" aria-label="Yes" />
                  ) : (
                    <Minus size={15} className="flex-none text-ink-4" aria-label="No" />
                  )}
                  {CAPABILITY_LABELS[k]}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <dl className="space-y-4 rounded-[12px] border border-border bg-panel p-4 shadow-[var(--shadow)]">
        <div>
          <dt className="text-[13px] font-medium text-ink-3">Takes in</dt>
          <dd className="mt-1 flex flex-wrap gap-[6px]">
            {io.input.map((m) => (
              <Pill key={m}>{MODALITY[m] ?? m}</Pill>
            ))}
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-medium text-ink-3">Produces</dt>
          <dd className="mt-1 flex flex-wrap gap-[6px]">
            {io.output.map((m) => (
              <Pill key={m}>{MODALITY[m] ?? m}</Pill>
            ))}
          </dd>
        </div>
        {efforts.length > 0 && (
          <div>
            <dt className="text-[13px] font-medium text-ink-3">Effort settings the source lists</dt>
            <dd className="mt-1 flex flex-wrap gap-[6px]">
              {efforts.map((e) => (
                <Pill key={e}>{e}</Pill>
              ))}
            </dd>
          </div>
        )}
        {features.length > 0 && (
          <div>
            <dt className="text-[13px] font-medium text-ink-3">Features</dt>
            <dd className="mt-1 flex flex-wrap gap-[6px]">
              {features.map((f) => (
                <Pill key={f}>{f}</Pill>
              ))}
            </dd>
          </div>
        )}
        {open && (
          <div>
            <dt className="text-[13px] font-medium text-ink-3">Open weights</dt>
            <dd className="mt-1 space-y-1 text-[14px] text-ink-2">
              {open.license && <div>License: {open.license}</div>}
              {open.minVramGb ? <div>Runs in about {open.minVramGb} GB of GPU memory</div> : null}
              {open.runtimes.length > 0 && <div>Runtimes: {open.runtimes.join(", ")}</div>}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
