import { useState, type FormEvent } from "react";
import { m, AnimatePresence } from "framer-motion";
import type { Profile } from "../../../types";
import { useSearch } from "../../hooks/useSearch";
import SearchResult from "../Search/SearchResult";

/** Interest → one-tap prompt. First match wins; generic fallbacks fill up. */
const SUGGESTIONS: [string, string][] = [
  ["tech", "Catch me up on tech today"],
  ["anime", "What anime should I watch tonight?"],
  ["gaming", "Any big game news this week?"],
  ["science", "Tell me something mind-blowing"],
  ["finance", "What's moving the markets?"],
  ["music", "Find me something new to listen to"],
  ["movies", "What's worth watching right now?"],
];
const FALLBACKS = ["Surprise me with something cool", "Help me unwind for 10 minutes"];

/**
 * The hero interaction: one big "Ask Aura" bar. Results open in a floating
 * panel UNDER the bar (overlay, not in-flow) so answering a question never
 * shoves the rest of the dashboard around.
 */
export default function AskAura({ profile }: { profile: Profile }) {
  const search = useSearch(profile);
  const [value, setValue] = useState("");

  const open = !!(search.result || search.error);

  const chips = [
    ...SUGGESTIONS.filter(([k]) => profile.interests.includes(k)).map(
      ([, q]) => q
    ),
    ...FALLBACKS,
  ].slice(0, 3);

  function submit(e: FormEvent) {
    e.preventDefault();
    if (value.trim()) search.search(value);
  }

  function ask(q: string) {
    setValue(q);
    search.search(q);
  }

  return (
    <div className="relative w-full">
      <form onSubmit={submit}>
        <div className="glass-strong flex items-center gap-1 pl-6 pr-2">
          <span
            className={`text-xl ${search.loading ? "animate-pulse" : ""}`}
            aria-hidden
          >
            ✦
          </span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ask Aura anything — news, anime, ideas…"
            autoFocus
            className="min-w-0 flex-1 bg-transparent px-3 py-5 text-lg text-ink placeholder:text-faint focus:outline-none"
          />
          <m.button
            type="submit"
            disabled={search.loading || !value.trim()}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="m-2 rounded-full bg-hero px-6 py-3 text-sm font-semibold text-white shadow-glow transition-opacity disabled:opacity-40"
          >
            {search.loading ? "Thinking…" : "Ask"}
          </m.button>
        </div>
      </form>

      {/* One-tap prompts — communicate what Aura is FOR within seconds. */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
        {chips.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => ask(q)}
            className="rounded-full border border-hairline bg-glass px-3.5 py-1.5 text-xs text-subtle backdrop-blur-md transition-all hover:border-primary/40 hover:text-ink hover:shadow-glow"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Floating answer panel — overlays the feed instead of reflowing it. */}
      <AnimatePresence>
        {open && (
          <m.div
            initial={{ opacity: 0, y: 10, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="absolute left-0 right-0 top-full z-30 mt-3 max-h-[46vh] overflow-y-auto"
          >
            <SearchResult
              result={search.result}
              error={search.error}
              onClose={search.clear}
            />
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
