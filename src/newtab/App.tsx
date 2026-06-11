import { useState } from "react";
import { m, type Variants } from "framer-motion";
import type { Profile, ThemeId } from "../types";
import { useProfile } from "./hooks/useProfile";
import { useMood } from "./hooks/useMood";
import { useFeed } from "./hooks/useFeed";
import { useSession } from "./hooks/useSession";
import { useTheme } from "./hooks/useTheme";
import OnboardingWizard from "./components/Onboarding/OnboardingWizard";
import Backdrop from "./components/Backdrop/Backdrop";
import TopNav from "./components/Nav/TopNav";
import ThemeGallery from "./components/Theme/ThemeGallery";
import GradientArt from "./components/Theme/GradientArt";
import ThemeLogo from "./components/Theme/ThemeLogo";
import AskAura from "./components/Hero/AskAura";
import MoodRow from "./components/Mood/MoodRow";
import FeedStrip from "./components/Feed/FeedStrip";
import StatsPanel from "./components/Stats/StatsPanel";
import SystemMonitor from "./components/System/SystemMonitor";

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

function todayLine(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

/**
 * Hero-first layout — the page reads as an AI companion, not a widget grid:
 *
 *   1. TopNav        (slim chrome: themes · logo · clock · gallery)
 *   2. HERO          greeting → Ask Aura (THE interaction) → mood row
 *   3. FEED          fills the remaining height, pulled up toward the hero
 *   4. FooterRail    demoted utilities (countdown chip · topics · RM)
 *
 * Visual tiers match the priority: glass-strong for Ask Aura only,
 * glass-card for content, bare chips for utilities.
 */
function Dashboard({ profile }: { profile: Profile }) {
  const { theme, themeId, setTheme } = useTheme();
  const { mood, setMood, history } = useMood();
  const feed = useFeed(profile, mood);
  const { clock } = useSession();
  const [galleryOpen, setGalleryOpen] = useState(false);
  // Theme being hover-previewed from the nav (crossfades gradient art in).
  const [hoverTheme, setHoverTheme] = useState<ThemeId | null>(null);

  const topics = profile.topTopics?.length
    ? profile.topTopics
    : profile.interests;

  return (
    <div className="relative h-screen overflow-hidden">
      <Backdrop theme={theme} />
      {/* Hover-reveal layer: previews a theme's gradient art under the UI. */}
      <GradientArt
        themeId={hoverTheme === themeId ? null : hoverTheme}
        opacity={0.5}
        className="z-[5]"
      />
      {/* Theme emblem behind the hero (blurs through the glass). */}
      <ThemeLogo themeId={themeId} />

      <m.div
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto flex h-full w-full flex-col gap-4 p-6 xl:px-14 2xl:px-24"
      >
        <m.div variants={fadeUp}>
          <TopNav
            currentThemeId={themeId}
            onPickTheme={setTheme}
            onHoverTheme={setHoverTheme}
            onOpenGallery={() => setGalleryOpen(true)}
          />
        </m.div>

        <main className="flex min-h-0 flex-1 flex-col">
          {/* Top area: system monitor · HERO · today card */}
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.75fr)_minmax(0,1.7fr)_minmax(0,0.75fr)]">
            <m.section
              variants={fadeUp}
              className="hidden min-h-0 overflow-y-auto lg:block"
            >
              <SystemMonitor />
            </m.section>

            {/* HERO — greeting + Ask Aura + mood, centered */}
            <m.section
              variants={fadeUp}
              className="mx-auto mt-[clamp(4px,4.5vh,56px)] w-full max-w-3xl text-center"
            >
              <h1 className="gradient-hero-text font-display text-4xl font-semibold tracking-tight xl:text-5xl">
                {greeting()}, {profile.name || "friend"}
              </h1>
              <p className="mt-2 text-sm text-subtle">
                {todayLine()} — your AI companion for the open tab.
              </p>

              <div className="mt-6">
                <AskAura profile={profile} />
              </div>

              <div className="mt-4">
                <MoodRow
                  mood={mood}
                  onSelect={setMood}
                  history={history}
                  reshuffling={feed.reshuffling}
                  feedError={feed.feedError}
                />
              </div>
            </m.section>

            <m.section
              variants={fadeUp}
              className="hidden min-h-0 overflow-y-auto lg:block"
            >
              <StatsPanel
                clock={clock}
                goalMinutes={profile.screenTimeGoalMinutes}
                topics={topics}
              />
            </m.section>
          </div>

          {/* FEED — full-width strip beneath */}
          <m.div variants={fadeUp} className="pt-3">
            <FeedStrip
              items={feed.items}
              loading={feed.loading}
              reshuffling={feed.reshuffling}
              stale={feed.stale}
              feedError={feed.feedError}
              aiActive={feed.aiActive}
              onRefresh={feed.refresh}
            />
          </m.div>
        </main>
      </m.div>

      {/* Full-screen cinematic theme picker */}
      <ThemeGallery
        open={galleryOpen}
        currentThemeId={themeId}
        onPick={setTheme}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  );
}
