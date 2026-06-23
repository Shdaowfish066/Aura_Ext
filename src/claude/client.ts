// Direct Gemini calls are intentionally disabled. All AI goes through the
// FastAPI backend (src/api/client.ts) to keep the API key out of the
// extension bundle.

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

/** Always false — the extension bundle never ships an API key. */
export function hasApiKey(): boolean {
  return false;
}

type CallOptions = {
  maxTokens?: number;
  /** Accepted for API compatibility — ignored. */
  cacheSystem?: boolean;
  signal?: AbortSignal;
  /** Accepted for API compatibility — ignored. */
  jsonMode?: boolean;
};

/**
 * Direct model calls are disabled — always throws ClaudeError("no_key").
 * Callers must use the FastAPI backend (src/api/client.ts) instead.
 */
export async function callClaude(
  _system: string,
  _user: string,
  _options: CallOptions = {}
): Promise<string> {
  throw new ClaudeError(
    "Direct API calls disabled — backend required.",
    "no_key"
  );
}

/** Strip ```json … ``` fences the model sometimes adds despite instructions. */
export function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
}

/**
 * Like callClaude, but forces JSON mode and parses the response.
 * Direct calls are disabled, so this always throws ClaudeError("no_key").
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
    console.error("[Aura] Raw response that failed to parse:", text);
    throw new ClaudeError("Could not parse the model's JSON response.", "parse");
  }
}
