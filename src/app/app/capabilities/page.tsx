import Link from "next/link";
import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { getDataSource } from "@/lib/data";
import { CAPABILITY_DESC, CAPABILITY_GROUPS, CAPABILITY_LABELS } from "@/lib/domain/capabilities";
import type { CapabilityKey } from "@/lib/domain/types";
import { Topbar } from "@/components/layout/Topbar";
import { SectionLabel } from "@/components/common/Panel";

export const metadata: Metadata = { title: "Capabilities" };

export default async function CapabilitiesPage() {
  const facets = await getDataSource().getFacets();
  const countByKey = new Map(facets.capabilities.map((c) => [c.key, c.count]));

  return (
    <>
      <Topbar>
        <span className="text-[15px] font-semibold tracking-[-0.02em]">Capabilities</span>
        <span className="text-ink-4">·</span>
        <span className="text-[14px] text-ink-3">{CAPABILITY_GROUPS.reduce((n, g) => n + g.keys.length, 0)} tracked</span>
      </Topbar>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-12 pt-[22px]">
        <p className="mb-7 max-w-[70ch] text-[15px] leading-[1.6] text-ink-2">
          Every capability Impulse tracks. Select one to filter the models that support it.
        </p>

        <div className="flex flex-col gap-8">
          {CAPABILITY_GROUPS.map((group) => (
            <section key={group.label}>
              <SectionLabel>{group.label}</SectionLabel>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3">
                {group.keys.map((key: CapabilityKey) => {
                  const count = countByKey.get(key) ?? 0;
                  return (
                    <Link
                      key={key}
                      href={`/app/models?caps=${key}`}
                      className="group flex flex-col rounded-[10px] border border-border bg-panel p-[16px] transition-colors hover:border-border-strong hover:bg-hover"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[15px] font-medium text-ink">
                          {CAPABILITY_LABELS[key]}
                        </span>
                        <ArrowUpRight
                          size={15}
                          className="text-ink-4 transition-colors group-hover:text-ink-2"
                        />
                      </div>
                      <p className="mt-[8px] text-[13px] leading-[1.5] text-ink-3">
                        {CAPABILITY_DESC[key]}
                      </p>
                      <span className="mt-[12px] text-[13px] text-ink-4">
                        {count} model{count === 1 ? "" : "s"}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
