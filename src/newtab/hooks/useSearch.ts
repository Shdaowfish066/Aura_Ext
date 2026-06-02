import { useState } from "react";
import type { Profile } from "../../types";
import type { SearchResponse } from "../../claude/types";
import { ClaudeError, callClaudeJSON } from "../../claude/client";
import { classifyIntent, searchPrompt } from "../../claude/prompts";

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
