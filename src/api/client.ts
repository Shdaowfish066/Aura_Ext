// Aura backend client — talks to the local FastAPI server (Agent E, server/).
// Every call can fail with BackendDownError; callers treat that as "use the
// existing client-side code path" so the extension keeps working offline.

import type { FeedItem, Mood, MoodHistoryEntry, Profile } from "../types";

const API_BASE =
  (import.meta.env.VITE_AURA_API_URL as string | undefined) ??
  "http://127.0.0.1:8000";

/** Thrown when the backend is unreachable ("down") or returned non-2xx ("http"). */
export class BackendDownError extends Error {
  constructor(
    message: string,
    readonly kind: "down" | "http" = "down",
    readonly status?: number,
    readonly detail?: string
  ) {
    super(message);
    this.name = "BackendDownError";
  }
}

/**
 * Fetch JSON from the backend with a timeout. Network errors / timeouts throw
 * BackendDownError("down"); non-2xx responses throw BackendDownError("http").
 */
export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 5000
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } catch (err) {
    throw new BackendDownError(
      `Aura backend unreachable: ${err instanceof Error ? err.message : String(err)}`,
      "down"
    );
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    let detail = "";
    try {
      const body = await response.json();
      detail =
        typeof body?.detail === "string"
          ? body.detail
          : JSON.stringify(body?.detail ?? body ?? "");
    } catch {
      /* ignore body parse failures */
    }
    throw new BackendDownError(
      `Aura backend error ${response.status}${detail ? `: ${detail}` : ""}`,
      "http",
      response.status,
      detail
    );
  }

  return (await response.json()) as T;
}

export function apiGet<T>(path: string, timeoutMs?: number): Promise<T> {
  return apiFetch<T>(path, { method: "GET" }, timeoutMs);
}

export function apiPost<T>(
  path: string,
  body: unknown,
  timeoutMs?: number
): Promise<T> {
  return apiFetch<T>(
    path,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    timeoutMs
  );
}

export function apiPut<T>(
  path: string,
  body: unknown,
  timeoutMs?: number
): Promise<T> {
  return apiFetch<T>(
    path,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    timeoutMs
  );
}

// --- Availability memo ------------------------------------------------------

const HEALTH_MEMO_MS = 60 * 1000;
let healthCheckedAt = 0;
let healthResult = false;
let healthInFlight: Promise<boolean> | null = null;

export type HealthResponse = { ok: boolean; version: string };

/**
 * True when GET /api/health answers within 1500ms. The result is memoized for
 * 60s so multiple hooks don't each re-ping the server.
 */
export function isBackendUp(): Promise<boolean> {
  const now = Date.now();
  if (now - healthCheckedAt < HEALTH_MEMO_MS) {
    return Promise.resolve(healthResult);
  }
  if (healthInFlight) return healthInFlight;
  healthInFlight = apiGet<HealthResponse>("/api/health", 1500)
    .then((res) => res?.ok === true)
    .catch(() => false)
    .then((up) => {
      healthResult = up;
      healthCheckedAt = Date.now();
      healthInFlight = null;
      return up;
    });
  return healthInFlight;
}

// --- Typed endpoint wrappers --------------------------------------------------

export type ClaudeProxyRequest = {
  system: string;
  user: string;
  maxTokens?: number;
  jsonMode?: boolean;
};
export type ClaudeProxyResponse = { text: string };

export function claudeProxy(req: ClaudeProxyRequest): Promise<ClaudeProxyResponse> {
  return apiPost<ClaudeProxyResponse>("/api/claude", req, 30000);
}

export type FeedRequest = {
  interests: string[];
  mood: string | null;
  name?: string;
  browsingGoal?: string;
  force?: boolean;
};
export type FeedResponse = {
  items: FeedItem[];
  aiUsed: boolean;
  errorMessage: string | null;
  cached: boolean;
};

export function fetchCuratedFeed(req: FeedRequest): Promise<FeedResponse> {
  return apiPost<FeedResponse>("/api/feed", req, 30000);
}

export type SearchRequest = {
  query: string;
  interests: string[];
  name?: string;
};
export type SearchBackendResponse = { text: string };

export function searchBackend(req: SearchRequest): Promise<SearchBackendResponse> {
  return apiPost<SearchBackendResponse>("/api/search", req, 30000);
}

export type ProfileSyncResponse = {
  exists: boolean;
  profile?: Profile;
  updatedAt?: number;
};

export function getProfileSync(): Promise<ProfileSyncResponse> {
  return apiGet<ProfileSyncResponse>("/api/sync/profile");
}

export function putProfileSync(profile: Profile): Promise<{ ok: true }> {
  return apiPut<{ ok: true }>("/api/sync/profile", profile);
}

export type MoodSyncPayload = {
  current: Mood;
  history: MoodHistoryEntry[];
};
export type MoodSyncResponse = {
  current: string | null;
  history: MoodHistoryEntry[];
};

export function getMoodSync(): Promise<MoodSyncResponse> {
  return apiGet<MoodSyncResponse>("/api/sync/mood");
}

export function putMoodSync(payload: MoodSyncPayload): Promise<{ ok: true }> {
  return apiPut<{ ok: true }>("/api/sync/mood", payload);
}
