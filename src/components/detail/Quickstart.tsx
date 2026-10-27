import type { Snippet } from "@/lib/catalog/quickstart";
import { CodeBlock } from "@/components/common/CodeBlock";
import { Tabs } from "@/components/ui/Tabs";

export function Quickstart({ snippets }: { snippets: Snippet[] }) {
  return (
    <Tabs
      tabs={snippets.map((s) => ({
        id: s.id,
        label: s.label,
        content: <CodeBlock code={s.code} label={s.lang === "bash" ? "Shell" : s.lang === "python" ? "Python" : "TypeScript"} />,
      }))}
    />
  );
}
