// Google Gemini API client — a thin fetch wrapper for the browser/extension.
// Uses the Gemini REST API directly (no SDK needed).
// Free tier: 15 RPM, 1500 requests/day, no credit card required.
// Get a free key at: https://aistudio.google.com/apikey

const GEMINI_MODEL = "gemini-2.5-flash";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const API_KEY = (import.meta.env as Record<string, string | undefined>)
  .VITE_GEMINI_API_KEY;

export class ClaudeError extends Error {
  constructor(
    message: string,
    readonly kind: "offline" | "no_key" | "http" | "parse" = "http",
    readonly status?: number
  ) {
    super(message);
    this.name = "ClaudeError";
  }
}

/** True when the browser reports a network connection. */
export function isOnline(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

/** True when an API key was injected at build time. */
export function hasApiKey(): boolean {
  return Boolean(API_KEY);
}

type CallOptions = {
  maxTokens?: number;
  /** Accepted for API compatibility — ignored (Gemini handles caching automatically). */
  cacheSystem?: boolean;
  signal?: AbortSignal;
  /** When true, instructs Gemini to return raw JSON (no fences, no prose). */
  jsonMode?: boolean;
};

/** Extract the non-thinking text part from a Gemini response. */
function extractText(data: any): string | undefined {
  const parts: any[] = data?.candidates?.[0]?.content?.parts ?? [];
  // gemini-2.5-flash thinking mode adds parts with thought:true — skip them
  const textPart = parts.find((p) => !p.thought && typeof p.text === "string");
  return textPart?.text;
}

/**
 * Send one system+user turn to Gemini and return the text of the first
 * candidate. Throws ClaudeError on offline / missing key / non-2xx / empty body.
 */
export async function callClaude(
  system: string,
  user: string,
  { maxTokens = 1000, signal, jsonMode = false }: CallOptions = {}
): Promise<string> {
  if (!isOnline()) {
    throw new ClaudeError("You appear to be offline.", "offline");
  }
  if (!API_KEY) {
    throw new ClaudeError(
      "Missing VITE_GEMINI_API_KEY. Add it to .env.local and rebuild.",
      "no_key"
    );
  }

  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: maxTokens,
    // Disable thinking budget for structured JSON tasks — faster + cheaper
    thinkingConfig: { thinkingBudget: 0 },
  };
  if (jsonMode) {
    generationConfig.responseMimeType = "application/json";
  }

  const response = await fetch(`${ENDPOINT}?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig,
    }),
    signal,
  });

  if (!response.ok) {
    let detail = "";
    try {
      const err = await response.json();
      detail = err?.error?.message ?? "";
    } catch {
      /* ignore */
    }
    throw new ClaudeError(
      `Gemini API error ${response.status}${detail ? `: ${detail}` : ""}`,
      "http",
      response.status
    );
  }

  const data = await response.json();
  const text = extractText(data);
  if (typeof text !== "string") {
    throw new ClaudeError("Gemini returned an empty response.", "parse");
  }
  return text;
}

/** Strip ```json … ``` fences the model sometimes adds despite instructions. */
function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
}

/**
 * Like callClaude, but forces JSON mode and parses the response.
 * A parse failure throws a ClaudeError("parse") so callers can show a fallback.
 */
export async function callClaudeJSON<T>(
  system: string,
  user: string,
  options: CallOptions = {}
): Promise<T> {
  const text = await callClaude(system, user, { ...options, jsonMode: true });
  try {
    return JSON.parse(stripFences(text)) as T;
  } catch {
    console.error("[Aura] Gemini raw response that failed to parse:", text);
    throw new ClaudeError("Could not parse Gemini's JSON response.", "parse");
  }
}
