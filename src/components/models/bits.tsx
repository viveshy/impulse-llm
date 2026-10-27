import Link from "next/link";
import { CAPABILITY_SHORT } from "@/lib/domain/capabilities";
import type { CapabilityKey } from "@/lib/domain/types";
import type { CanonicalModel, ModelKind } from "@/lib/catalog/types";
import { modelHref } from "@/lib/routes";
import { clsx } from "@/lib/utils/clsx";

export const KIND_LABEL: Record<ModelKind, string> = {
  chat: "Chat",
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
  other: "Other",
};

/** The capabilities a builder checks first, in the order they matter. */
const HEADLINE_CAPS: CapabilityKey[] = ["reasoning", "toolCalling", "vision", "structuredOutputs", "promptCaching", "audio"];

export function headlineCaps(m: Pick<CanonicalModel, "capabilities">, max = 4): string[] {
  const has = new Set(m.capabilities);
  if (has.has("functionCalling")) has.add("toolCalling");
  return HEADLINE_CAPS.filter((k) => has.has(k))
    .slice(0, max)
    .map((k) => CAPABILITY_SHORT[k]);
}

export function CapLine({ model, max = 4, className }: { model: CanonicalModel; max?: number; className?: string }) {
  const caps = headlineCaps(model, max);
  if (!caps.length) return null;
  return <span className={clsx("text-[13px] text-ink-3", className)}>{caps.join(" · ")}</span>;
}

export function ModelLink({ model, className }: { model: CanonicalModel; className?: string }) {
  return (
    <Link href={modelHref(model)} className={clsx("font-medium text-ink hover:text-accent hover:underline", className)}>
      {model.name}
    </Link>
  );
}
