import { Fragment } from "react";
import { Check, Minus } from "lucide-react";
import { CAPABILITY_GROUPS, CAPABILITY_LABELS } from "@/lib/domain/capabilities";
import type { Capabilities } from "@/lib/domain/types";
import { clsx } from "@/lib/utils/clsx";

export function CapabilityChecklist({ capabilities }: { capabilities: Capabilities }) {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-[2px] sm:grid-cols-2">
      {CAPABILITY_GROUPS.map((group) => (
        <Fragment key={group.label}>
          <div className="col-span-full mt-[14px] text-[13px] uppercase tracking-[0.08em] text-ink-4 first:mt-0">
            {group.label}
          </div>
          {group.keys.map((key) => {
            const on = capabilities[key];
            return (
              <div
                key={key}
                className={clsx(
                  "flex h-[29px] items-center gap-[10px] text-[15px]",
                  on ? "text-ink" : "text-ink-4",
                )}
              >
                {on ? (
                  <Check size={15} className="flex-none text-ink-2" strokeWidth={2.2} />
                ) : (
                  <Minus size={15} className="flex-none text-ink-4" strokeWidth={2.2} />
                )}
                {CAPABILITY_LABELS[key]}
              </div>
            );
          })}
        </Fragment>
      ))}
    </div>
  );
}
