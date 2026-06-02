import type { Profile } from "../types";
import { useProfile } from "./hooks/useProfile";
import { useMood } from "./hooks/useMood";
import { useFeed } from "./hooks/useFeed";
import { useSession } from "./hooks/useSession";
import { useSearch } from "./hooks/useSearch";
import OnboardingWizard from "./components/Onboarding/OnboardingWizard";
import FeedPanel from "./components/Feed/FeedPanel";
import MoodWidget from "./components/Mood/MoodWidget";
import MoodBadge from "./components/Mood/MoodBadge";
import SearchBar from "./components/Search/SearchBar";
import SearchResult from "./components/Search/SearchResult";
import StatsPanel from "./components/Stats/StatsPanel";

export default function App() {
  const { profile, loading, setProfile } = useProfile();

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center text-subtle">
        <span className="font-display text-lg tracking-tight animate-pulse">
          Aura
        </span>
      </div>
    );
  }

  if (!profile?.setupComplete) {
    return <OnboardingWizard onComplete={setProfile} />;
  }

  return <Dashboard profile={profile} />;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard({ profile }: { profile: Profile }) {
  const { mood, setMood } = useMood();
  const feed = useFeed(profile, mood);
  const { clock, minutesElapsed } = useSession();
  const search = useSearch(profile);

  const topics = profile.topTopics?.length
    ? profile.topTopics
    : profile.interests;

  return (
    <div className="relative h-screen overflow-hidden">
      <Aurora />

      <div className="relative z-10 mx-auto grid h-full max-w-[1400px] grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_minmax(0,0.85fr)]">
        {/* Left — feed */}
        <section className="hidden min-h-0 lg:block">
          <FeedPanel
            items={feed.items}
            loading={feed.loading}
            reshuffling={feed.reshuffling}
            stale={feed.stale}
            onRefresh={feed.refresh}
          />
        </section>

        {/* Center — brand, mood, search */}
        <section className="flex min-h-0 flex-col gap-5 overflow-y-auto">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-4xl font-semibold tracking-tight text-ink">
                Aura
              </h1>
              <p className="mt-1 text-sm text-subtle">
                {greeting()}
                {profile.name ? `, ${profile.name}` : ""}.
              </p>
            </div>
            <MoodBadge mood={mood} />
          </header>

          <MoodWidget
            mood={mood}
            onSelect={setMood}
            reshuffling={feed.reshuffling}
          />

          <SearchBar onSearch={search.search} loading={search.loading} />

          <SearchResult
            result={search.result}
            error={search.error}
            onClose={search.clear}
          />

          {/* Feed on small screens (no left column) */}
          <div className="lg:hidden">
            <FeedPanel
              items={feed.items}
              loading={feed.loading}
              reshuffling={feed.reshuffling}
              stale={feed.stale}
              onRefresh={feed.refresh}
            />
          </div>
        </section>

        {/* Right — stats */}
        <section className="hidden min-h-0 overflow-y-auto lg:block">
          <StatsPanel
            clock={clock}
            minutesElapsed={minutesElapsed}
            goalMinutes={profile.screenTimeGoalMinutes}
            topics={topics}
          />
        </section>
      </div>
    </div>
  );
}

/** Soft animated background blobs. */
function Aurora() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="aurora-blob absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
      <div className="aurora-blob absolute right-0 top-1/3 h-96 w-96 rounded-full bg-warm/15 blur-3xl [animation-delay:-6s]" />
      <div className="aurora-blob absolute bottom-0 left-1/3 h-96 w-96 rounded-full bg-primary/15 blur-3xl [animation-delay:-12s]" />
    </div>
  );
}
