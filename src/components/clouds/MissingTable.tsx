import Link from "next/link";
import type { MissingModel } from "@/lib/catalog/clouds";
import { cloudById, type Cloud } from "@/lib/clouds";
import { cloudHref, modelHref } from "@/lib/routes";
import { CloudMark, LabMark } from "@/components/ui/BrandMark";

/**
 * Lineup models a cloud doesn't sell (in the chosen zone), with where else to get them. `outside`: where the cloud
 * does list a model the zone lacks, as in "On AWS, outside Europe". When a listing of it names no region, it may be in
 * the zone after all, so the row says so and points to the cloud's own list.
 */
export function MissingTable({ missing, cloud, outside }: { missing: MissingModel[]; cloud: Cloud; outside?: string }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Model</th>
            <th>Where to get it</th>
          </tr>
        </thead>
        <tbody>
          {missing.map(({ model, onCloud, elsewhere }) => (
            <tr key={model.slug}>
              <td className="wrap">
                <div className="flex items-center gap-2">
                  <LabMark labId={model.labId} name={model.labName} size={22} />
                  <Link href={modelHref(model)} className="font-medium text-ink hover:text-accent hover:underline">
                    {model.name}
                  </Link>
                </div>
              </td>
              <td className="wrap text-[14px] text-ink-2">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  {onCloud === "outside" && (
                    <Link href={cloudHref(cloud.id)} className="hover:text-ink hover:underline">
                      On {cloud.name}, {outside}
                    </Link>
                  )}
                  {onCloud === "unplaced" && (
                    <span>
                      On {cloud.name}, region not listed.{" "}
                      <a href={cloud.regionsUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                        Check {cloud.short}&rsquo;s list
                      </a>
                    </span>
                  )}
                  {elsewhere.map((id) => {
                    const c = cloudById(id)!;
                    return (
                      <Link key={id} href={cloudHref(id)} className="inline-flex items-center gap-2 hover:text-ink hover:underline">
                        <CloudMark id={id} name={c.name} size={20} />
                        {c.name}
                      </Link>
                    );
                  })}
                  {!onCloud && !elsewhere.length && (
                    <span className="text-ink-3">
                      None of these clouds.{" "}
                      <Link href={`${modelHref(model)}#hosts`} className="text-accent hover:underline">
                        Where it runs
                      </Link>
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
