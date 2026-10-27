/** Canonical key → the name a lab would print ("claude-opus-5-5" → "Claude Opus 5.5"). */
import { own } from "@/lib/utils/own";

const BRANDS: Record<string, string> = {
  claude: "Claude",
  gpt: "GPT",
  chatgpt: "ChatGPT",
  gemini: "Gemini",
  gemma: "Gemma",
  grok: "Grok",
  llama: "Llama",
  codellama: "Code Llama",
  mistral: "Mistral",
  mixtral: "Mixtral",
  ministral: "Ministral",
  magistral: "Magistral",
  codestral: "Codestral",
  devstral: "Devstral",
  pixtral: "Pixtral",
  voxtral: "Voxtral",
  deepseek: "DeepSeek",
  qwen: "Qwen",
  qwq: "QwQ",
  qvq: "QVQ",
  kimi: "Kimi",
  glm: "GLM",
  minimax: "MiniMax",
  mimo: "MiMo",
  command: "Command",
  sonar: "Sonar",
  nova: "Nova",
  titan: "Titan",
  phi: "Phi",
  imagen: "Imagen",
  veo: "Veo",
  sora: "Sora",
  whisper: "Whisper",
  jamba: "Jamba",
  nemotron: "Nemotron",
  granite: "Granite",
  flux: "FLUX",
  codex: "Codex",
  lyria: "Lyria",
};

const UPPER = new Set(["it", "vl", "hd", "tts", "ocr", "api", "fim", "moe", "xl", "ai", "r1", "ii", "pplx"]);

const isDigits = (t: string) => /^\d+$/.test(t);

function word(t: string): string {
  if (UPPER.has(t)) return t.toUpperCase();
  if (/^\d+(\.\d+)?[bkmt]$/.test(t)) return t.toUpperCase(); // 8b → 8B, 32k → 32K
  if (/^[a-z]\d+[a-z]$/.test(t)) return t.toUpperCase(); // a3b → A3B
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function brand(t: string): string {
  const exact = own(BRANDS, t);
  if (exact) return exact;
  const m = t.match(/^([a-z]+)(\d.*)$/); // qwen3 → Qwen3
  const head = m && own(BRANDS, m[1]);
  if (m && head) return head + m[2];
  return word(t);
}

/** Keys whose printed name can't be derived from the key. */
const EXACT: Record<string, string> = {
  chat: "ChatGPT Latest", // OpenAI's `chat-latest`
};

export function displayName(key: string): string {
  const exact = own(EXACT, key);
  if (exact) return exact;
  if (key.startsWith("gpt-oss")) return key;
  if (/^o\d+(-|$)/.test(key)) {
    const [head, next, ...rest] = key.split("-");
    const first = next && ["mini", "pro", "preview"].includes(next) ? `${head}-${next}` : head;
    const tail = next && first === head ? [next, ...rest] : rest;
    return [first, ...tail.map(word)].join(" ");
  }
  if (key.startsWith("dall-e")) return ["DALL·E", ...key.slice("dall-e".length).split("-").filter(Boolean).map(word)].join(" ");

  const tokens = key.split("-").filter(Boolean);
  const parts: string[] = [];
  let i = 0;
  const head = tokens[i++];

  if (head === "gpt" && tokens[i] && /^\d/.test(tokens[i])) {
    // GPT keeps its version hyphenated: GPT-6.1, GPT-4o.
    if (isDigits(tokens[i])) {
      const run: string[] = [];
      while (i < tokens.length && isDigits(tokens[i])) run.push(tokens[i++]);
      parts.push(`GPT-${run.join(".")}`);
    } else {
      parts.push(`GPT-${tokens[i++]}`);
    }
  } else {
    let b = brand(head);
    if (/\d$/.test(head)) while (i < tokens.length && isDigits(tokens[i])) b += `.${tokens[i++]}`;
    parts.push(b);
  }

  while (i < tokens.length) {
    const t = tokens[i];
    if (isDigits(t) || /^v\d+$/.test(t)) {
      const run = [t.startsWith("v") ? `V${t.slice(1)}` : t];
      i++;
      while (i < tokens.length && isDigits(tokens[i])) run.push(tokens[i++]);
      parts.push(run.join("."));
    } else if (t === "non" && tokens[i + 1]) {
      parts.push(`Non-${word(tokens[i + 1])}`);
      i += 2;
    } else {
      let w = word(t);
      i++;
      // qwen3-8 → Qwen3.8, kimi-k3-1 → K3.1
      if (/\d$/.test(t)) while (i < tokens.length && isDigits(tokens[i])) w += `.${tokens[i++]}`;
      parts.push(w);
    }
  }
  return parts.join(" ");
}
