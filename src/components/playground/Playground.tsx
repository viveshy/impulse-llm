"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, CornerDownLeft } from "lucide-react";
import type { Model } from "@/lib/domain/types";
import { formatTokens } from "@/lib/utils/format";
import { clsx } from "@/lib/utils/clsx";
import { Popover } from "@/components/common/Popover";

const CANNED =
  "Here's a concise take. First, frame the problem in terms of the smallest reproducible unit, then verify each assumption against real output before generalizing. A few things to watch for: edge cases at the boundaries, silent type coercions, and state that outlives its intended scope. If you share the specific input and the observed result, I can narrow this down further and suggest a concrete fix.";

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export function Playground({ models }: { models: Model[] }) {
  const chatModels = models.filter((m) => m.pricing.outputPerMTok !== null);
  const [modelId, setModelId] = useState(chatModels[0]?.id ?? "");
  const [system, setSystem] = useState("You are a helpful, concise assistant.");
  const [temperature, setTemperature] = useState(0.7);
  const [prompt, setPrompt] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [output, setOutput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const model = chatModels.find((m) => m.id === modelId) ?? chatModels[0];

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
    },
    [],
  );

  const run = () => {
    const text = prompt.trim();
    if (!text || streaming) return;
    setSent(text);
    setPrompt("");
    setOutput("");
    if (reduceMotion()) {
      setOutput(CANNED);
      return;
    }
    setStreaming(true);
    const words = CANNED.split(" ");
    let i = 0;
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      i += 1;
      setOutput(words.slice(0, i).join(" "));
      if (i >= words.length) {
        if (timer.current) clearInterval(timer.current);
        setStreaming(false);
      }
    }, 32);
  };

  return (
    <div className="flex min-h-0 flex-1">
      {/* conversation */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {!sent ? (
            <div className="grid h-full place-items-center">
              <p className="max-w-[42ch] text-center text-[15px] text-ink-3">
                Configure the model on the right, write a prompt below, and run it.
                <br />
                <span className="text-ink-4">Responses are simulated - no live inference.</span>
              </p>
            </div>
          ) : (
            <div className="mx-auto flex max-w-[760px] flex-col gap-5">
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-[10px] border border-border bg-panel px-[14px] py-[10px] text-[15px] text-ink">
                  {sent}
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-[2px] text-[11px] uppercase tracking-[0.1em] text-ink-4">
                  {model?.name}
                </div>
              </div>
              <div className="text-[15px] leading-[1.7] text-ink-2">
                {output}
                {streaming && <span className="ml-[1px] inline-block h-[15px] w-[2px] translate-y-[2px] bg-accent" />}
              </div>
            </div>
          )}
        </div>

        {/* input */}
        <div className="border-t border-border p-4">
          <div className="mx-auto flex max-w-[760px] items-end gap-3">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run();
              }}
              rows={2}
              placeholder="Write a prompt…  (⌘↵ to run)"
              className="flex-1 resize-none rounded-[8px] border border-border-strong bg-panel px-[12px] py-[10px] text-[15px] text-ink outline-none placeholder:text-ink-4 focus:border-accent-line"
            />
            <button
              type="button"
              onClick={run}
              disabled={!prompt.trim() || streaming}
              className="flex h-[42px] items-center gap-[7px] rounded-[8px] border border-border-strong bg-hover px-[16px] text-[14px] text-ink transition-colors enabled:hover:border-accent-line disabled:opacity-40"
            >
              Run <CornerDownLeft size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* params */}
      <div className="w-[300px] flex-none overflow-y-auto border-l border-border p-5 max-[900px]:hidden">
        <div className="flex flex-col gap-6">
          <div>
            <div className="mb-2 text-[12px] uppercase tracking-[0.1em] text-ink-4">Model</div>
            <Popover
              width={280}
              trigger={() => (
                <span className="flex h-[38px] w-full items-center justify-between rounded-[8px] border border-border-strong px-[11px] text-[14px] text-ink">
                  {model?.name ?? "Select"}
                  <ChevronDown size={14} className="text-ink-3" />
                </span>
              )}
            >
              {(close) => (
                <div className="max-h-[320px] overflow-y-auto">
                  {chatModels.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setModelId(m.id);
                        close();
                      }}
                      className={clsx(
                        "flex w-full items-center justify-between gap-2 rounded-[6px] px-[9px] py-[7px] text-left text-[14px] transition-colors hover:bg-hover",
                        m.id === modelId ? "text-ink" : "text-ink-2",
                      )}
                    >
                      <span className="truncate">{m.name}</span>
                      <span className="flex-none text-[12px] text-ink-4">
                        {formatTokens(m.context.contextWindow)}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </Popover>
          </div>

          <label className="flex flex-col gap-2">
            <span className="flex items-center justify-between text-[12px] uppercase tracking-[0.1em] text-ink-4">
              Temperature <span className="tabular-nums text-ink-2">{temperature.toFixed(1)}</span>
            </span>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              className="accent-accent"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="text-[12px] uppercase tracking-[0.1em] text-ink-4">System prompt</span>
            <textarea
              value={system}
              onChange={(e) => setSystem(e.target.value)}
              rows={5}
              className="resize-none rounded-[8px] border border-border bg-panel px-[10px] py-[8px] text-[13px] leading-[1.5] text-ink-2 outline-none focus:border-accent-line"
            />
          </label>

          {model && (
            <div className="text-[12px] leading-[1.7] text-ink-4">
              {formatTokens(model.context.contextWindow)} context · $
              {model.pricing.inputPerMTok.toFixed(2)} in / ${model.pricing.outputPerMTok?.toFixed(2)} out
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
