import type { SearchResponse } from "../../../claude/types";

type Props = {
  result: SearchResponse | null;
  error: string | null;
  onClose: () => void;
};

export default function SearchResult({ result, error, onClose }: Props) {
  if (!result && !error) return null;

  return (
    <div className="animate-fade-up rounded-2xl border border-hairline bg-surface/90 p-5 backdrop-blur-xl">
      <div className="mb-2 flex items-start justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Aura
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-faint transition-colors hover:text-ink"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {error ? (
        <p className="text-sm text-warm">{error}</p>
      ) : (
        <>
          <p className="whitespace-pre-line text-[15px] leading-relaxed text-ink">
            {result!.answer}
          </p>
          {result!.items?.length > 0 && (
            <div className="mt-4 flex flex-col gap-3">
              {result!.items.map((it, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-hairline bg-elevated p-3"
                >
                  <div className="text-sm font-semibold text-ink">
                    {it.title}
                  </div>
                  <div className="mt-0.5 text-[13px] text-subtle">
                    {it.reason}
                  </div>
                  {it.links?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {it.links.map((link, j) => (
                        <a
                          key={j}
                          href={link}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-primary/15 px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-primary/25 transition-colors"
                        >
                          ▶ {siteName(link)}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Friendly display names for well-known legitimate platforms only.
const SITE_NAMES: Record<string, string> = {
  "crunchyroll.com": "Crunchyroll", "funimation.com": "Funimation",
  "netflix.com": "Netflix", "primevideo.com": "Prime Video",
  "disneyplus.com": "Disney+", "hulu.com": "Hulu", "max.com": "Max",
  "tubi.tv": "Tubi", "pluto.tv": "Pluto TV", "youtube.com": "YouTube",
  "spotify.com": "Spotify", "soundcloud.com": "SoundCloud",
  "store.steampowered.com": "Steam", "epicgames.com": "Epic Games",
  "itch.io": "itch.io", "amazon.com": "Amazon", "audible.com": "Audible",
  "archive.org": "Archive.org",
};

function siteName(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return SITE_NAMES[host] ?? host;
  } catch {
    return "link";
  }
}

function hostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}
