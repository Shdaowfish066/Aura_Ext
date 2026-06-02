// Types for Claude request inputs and parsed responses.
// Response shapes mirror the JSON contracts in the prompts (see prompts.ts).

import type { Mood } from "../types";

/** A raw article from a content source, before Claude curation. */
export type RawArticle = {
  id: string;
  title: string;
  url: string;
  source: string;
  topic: string;
  publishedAt: string;
  imageUrl?: string;
};

/** One element of the feed-curation JSON response. */
export type CurationItem = {
  id: string;
  claudeCaption: string;
  moodFit: string[];
  rank: number;
};

/** Intent classification passed to the search prompt. */
export type SearchIntent =
  | "recommendation"
  | "how_to"
  | "factual"
  | "news"
  | "emotional";

/** One recommendation/result inside a search answer. */
export type SearchResultItem = {
  title: string;
  reason: string;
  links: string[];
};

/** The full search JSON response. */
export type SearchResponse = {
  answer: string;
  items: SearchResultItem[];
};

/** Context passed alongside the feed-curation request. */
export type CurationContext = {
  mood: Mood;
  hour: number; // 0-23
};
