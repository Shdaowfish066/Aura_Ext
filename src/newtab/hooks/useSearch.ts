import { useState } from "react";
import type { Profile } from "../../types";
import type { SearchResponse } from "../../claude/types";
import { ClaudeError, callClaudeJSON } from "../../claude/client";
import { classifyIntent, searchPrompt } from "../../claude/prompts";
import { BackendDownError, searchBackend } from "../../api/client";

/** Strip ```json … ``` fences the model sometimes adds despite instructions. */
function stripFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return (fenced ? fenced[1] : trimmed).trim();
}

/**
 * Backend-first search: the server runs the same prompt and returns raw text.
 * Parsed with the same JSON handling the client-side path uses. Returns null
 * when the backend is unreachable/errored — caller falls back to Gemini.
 */
async function searchViaBackend(
  profile: Profile,
  query: string
): Promise<SearchResponse | null> {
  let text: string;
  try {
    const res = await searchBackend({
      query,
      interests: profile.interests,
      name: profile.name,
    });
    text = res.text;
  } catch (err) {
    if (err instanceof BackendDownError) return null; // fall back to local
    console.warn("[Aura] Backend search failed unexpectedly:", err);
    return null;
  }
  try {
    return JSON.parse(stripFences(text)) as SearchResponse;
  } catch {
    console.warn("[Aura] Backend search response failed to parse:", text);
    return null; // unparseable → let the local path try
  }
}

/** Handles a Claude search query. Never cached — always fresh (CLAUDE.md). */
export function useSearch(profile: Profile | undefined) {
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search(query: string) {
    const q = query.trim();
    if (!q || !profile) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      // Backend-first; null means "backend unavailable → use Gemini directly".
      const viaBackend = await searchViaBackend(profile, q);
      if (viaBackend) {
        setResult(viaBackend);
        return;
      }
      const { system, user } = searchPrompt(profile, q, classifyIntent(q));
      const res = await callClaudeJSON<SearchResponse>(system, user, {
        maxTokens: 800,
      });
      setResult(res);
    } catch (e) {
      setError(
        e instanceof ClaudeError ? e.message : "Search failed. Try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function clear() {
    setResult(null);
    setError(null);
  }

  return { result, loading, error, search, clear };
}
