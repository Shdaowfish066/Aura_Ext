import { useCallback, useEffect, useRef, useState } from "react";
import type { FeedItem, Mood, Profile } from "../../types";
import type { CurationItem, RawArticle } from "../../claude/types";
import { callClaudeJSON, hasApiKey, isOnline } from "../../claude/client";
import { feedCurationPrompt } from "../../claude/prompts";
import { feed as feedStore } from "../../storage";

const REFRESH_MS = 30 * 60 * 1000; // re-curate at most every 30 min (CLAUDE.md)
const MAX_TO_CURATE = 14; // cap Gemini input to stay within free tier

// --- Content sources (free, no key, CORS-safe from an extension page) -----

// HN feed type per mood — completely different article pools
const MOOD_HN_FEED: Record<string, string> = {
  hyped:    "topstories",   // viral, exciting
  good:     "newstories",   // fresh, unexplored
  tired:    "askstories",   // discussions, easy reads
  low:      "askstories",   // conversations, relatable
  stressed: "showstories",  // people showing cool projects, distracting
};

// Dev.to tag per mood
const MOOD_DEVTO_TAG: Record<string, string> = {
  hyped:    "javascript",
  good:     "webdev",
  tired:    "beginners",
  low:      "watercooler",
  stressed: "productivity",
};

// Jikan genre IDs mapped to mood
const MOOD_ANIME_GENRES: Record<string, number> = {
  tired: 4,    // Comedy
  low: 36,     // Slice of Life
  stressed: 4, // Comedy (light, easy)
  hyped: 1,    // Action
  good: 10,    // Fantasy (broad mix)
};

async function fetchHackerNews(mood?: Mood): Promise<RawArticle[]> {
  try {
    const feed = mood ? (MOOD_HN_FEED[mood as string] ?? "topstories") : "topstories";
    const ids: number[] = await (
      await fetch(`https://hacker-news.firebaseio.com/v0/${feed}.json`)
    ).json();
    const items = await Promise.all(
      ids.slice(0, 12).map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`)
          .then((r) => r.json())
          .catch(() => null)
      )
    );
    return items
      .filter((i) => i && i.title)
      .map((i) => ({
        id: `hn-${i.id}`,
        title: i.title,
        url: i.url ?? `https://news.ycombinator.com/item?id=${i.id}`,
        source: "Hacker News",
        topic: "tech",
        publishedAt: new Date((i.time ?? 0) * 1000).toISOString(),
      }));
  } catch {
    return [];
  }
}

async function fetchDevTo(mood?: Mood): Promise<RawArticle[]> {
  try {
    const tag = mood ? (MOOD_DEVTO_TAG[mood as string] ?? "") : "";
    const url = tag
      ? `https://dev.to/api/articles?per_page=10&tag=${tag}`
      : `https://dev.to/api/articles?per_page=10&top=1`;
    const res = await (await fetch(url)).json();
    return (res ?? []).map((a: any) => ({
      id: `devto-${a.id}`,
      title: a.title,
      url: a.url,
      source: "Dev.to",
      topic: "tech",
      publishedAt: a.published_at ?? new Date().toISOString(),
      imageUrl: a.cover_image ?? undefined,
    }));
  } catch {
    return [];
  }
}

async function fetchAnime(mood?: Mood): Promise<RawArticle[]> {
  try {
    const genreId = mood ? MOOD_ANIME_GENRES[mood as string] : undefined;
    const url = genreId
      ? `https://api.jikan.moe/v4/anime?genres=${genreId}&order_by=score&sort=desc&limit=12`
      : `https://api.jikan.moe/v4/top/anime?limit=12&filter=airing`;
    const res = await (await fetch(url)).json();
    return (res?.data ?? []).map((a: any) => ({
      id: `anime-${a.mal_id}`,
      title: a.title,
      url: a.url,
      source: "MyAnimeList",
      topic: "anime",
      publishedAt: a.aired?.from ?? new Date().toISOString(),
      imageUrl: a.images?.jpg?.image_url,
    }));
  } catch {
    return [];
  }
}

async function fetchSources(interests: string[], mood?: Mood): Promise<RawArticle[]> {
  const has = (...keys: string[]) => keys.some((k) => interests.includes(k));
  const wantTech = has("tech", "gaming", "science", "finance");
  const wantAnime = has("anime", "manga", "movies", "music");
  const jobs: Promise<RawArticle[]>[] = [];
  if (wantTech || (!wantTech && !wantAnime)) {
    jobs.push(fetchHackerNews(mood));
    jobs.push(fetchDevTo(mood));
  }
  if (wantAnime || (!wantTech && !wantAnime)) jobs.push(fetchAnime(mood));
  const results = await Promise.all(jobs);
  const flat: RawArticle[] = [];
  const max = Math.max(...results.map((r) => r.length), 0);
  for (let i = 0; i < max; i++)
    for (const r of results) if (r[i]) flat.push(r[i]);
  return flat;
}

// --- Curation -------------------------------------------------------------

const toRaw = (f: FeedItem): RawArticle => ({
  id: f.id,
  title: f.title,
  url: f.url,
  source: f.source,
  topic: f.topic,
  publishedAt: f.publishedAt,
  imageUrl: f.imageUrl,
});

function fallbackFeed(raw: RawArticle[]): FeedItem[] {
  return raw.map((a) => ({
    ...a,
    claudeCaption: `Trending on ${a.source}`,
    moodFit: [],
  }));
}

async function curate(
  raw: RawArticle[],
  profile: Profile,
  mood: Mood
): Promise<FeedItem[]> {
  const subset = raw.slice(0, MAX_TO_CURATE);
  if (!hasApiKey() || !isOnline()) return fallbackFeed(subset);
  try {
    const hour = new Date().getHours();
    const { system, user } = feedCurationPrompt(profile, mood, hour, subset);
    const curated = await callClaudeJSON<CurationItem[]>(system, user, {
      maxTokens: 1200,
      cacheSystem: true,
    });
    const byId = new Map(curated.map((c) => [c.id, c]));
    return subset
      .map((a) => {
        const c = byId.get(a.id);
        return {
          ...a,
          claudeCaption: c?.claudeCaption ?? `Trending on ${a.source}`,
          moodFit: c?.moodFit ?? [],
          _rank: c?.rank ?? 999,
        };
      })
      .sort((x, y) => (x as any)._rank - (y as any)._rank)
      .map(({ _rank, ...item }: any) => item as FeedItem);
  } catch {
    return fallbackFeed(subset);
  }
}

// --- Hook -----------------------------------------------------------------

export function useFeed(profile: Profile | undefined, mood: Mood) {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [reshuffling, setReshuffling] = useState(false);
  const [stale, setStale] = useState(false);
  const rawRef = useRef<RawArticle[]>([]);
  const loadedRef = useRef(false);

  // Updated every render — so async load callbacks always read the latest mood
  // without being in any closure or effect dependency.
  const latestMoodRef = useRef<Mood>(mood);
  latestMoodRef.current = mood;

  const load = useCallback(
    async (force = false) => {
      if (!profile) return;
      setLoading(true);
      const lastUpdated = (await feedStore.getLastUpdated()) ?? 0;
      const cache = await feedStore.getCache();
      const fresh = Date.now() - lastUpdated < REFRESH_MS;

      if (!force && fresh && cache.length) {
        rawRef.current = cache.map(toRaw);
        const effectiveMood = latestMoodRef.current;
        if (effectiveMood) {
          const recurated = await curate(rawRef.current, profile, effectiveMood);
          setItems(recurated);
          void feedStore.setCache(recurated);
        } else {
          setItems(cache);
        }
        setStale(false);
        setLoading(false);
        loadedRef.current = true;
        return;
      }

      const raw = await fetchSources(profile.interests, latestMoodRef.current);
      if (!raw.length) {
        setItems(cache);
        setStale(cache.length > 0);
        setLoading(false);
        return;
      }
      rawRef.current = raw;
      const curated = await curate(raw, profile, latestMoodRef.current);
      setItems(curated);
      setStale(false);
      await feedStore.setCache(curated);
      await feedStore.setLastUpdated(Date.now());
      setLoading(false);
      loadedRef.current = true;
    },
    [profile]
  );

  // Initial load (once profile is available).
  useEffect(() => {
    if (profile && !loadedRef.current) void load();
  }, [profile, load]);

  // Mood change → re-fetch mood-specific sources + re-curate.
  // This gives genuinely different articles (e.g. comedy anime when tired,
  // action when hyped) rather than just re-ranking the same pool.
  const prevMoodRef = useRef<Mood>(mood);
  useEffect(() => {
    if (prevMoodRef.current === mood) return;
    prevMoodRef.current = mood;
    if (!loadedRef.current || !profile) return;
    let alive = true;
    setReshuffling(true);
    fetchSources(profile.interests, mood).then((raw) => {
      if (!alive) return;
      if (raw.length) rawRef.current = raw;
      return curate(rawRef.current, profile, mood);
    }).then((next) => {
      if (!alive || !next) return;
      setItems(next);
      setReshuffling(false);
      void feedStore.setCache(next);
    }).catch(() => setReshuffling(false));
    return () => {
      alive = false;
    };
  }, [mood, profile]);

  return { items, loading, reshuffling, stale, refresh: () => load(true) };
}
