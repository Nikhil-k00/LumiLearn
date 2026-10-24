"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, ArrowLeft, Star, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import type { NewBadge } from "@/components/games/phonics/GameComplete";
import { useMemorySession }    from "@/hooks/useMemorySession";
import { useTTS }              from "@/hooks/useTTS";
import { useDashboardData }    from "@/hooks/useDashboardData";
import { usePoolGame }         from "@/hooks/usePoolGame";
import { getMemoryLevel, type MemoryLevel } from "@/data/memory-content";
import { calculateXP }         from "@/lib/gamification";
import { SoundSequence }       from "@/components/games/memory/SoundSequence";
import { RhymeMatcher }        from "@/components/games/memory/RhymeMatcher";
import { BeginningStart }      from "@/components/games/memory/BeginningStart";
import { Button }              from "@/components/ui/Button";
import { PageContainer }       from "@/components/ui/PageContainer";
import { Surface }             from "@/components/ui/Surface";

// Sequential order of the 3 mini-games within this section
const GAME_SEQUENCE = ["sequence", "rhyme", "beginning"] as const;
type MiniGame = typeof GAME_SEQUENCE[number];

const GAME_META: Record<MiniGame, { emoji: string; title: string }> = {
  "sequence":  { emoji: "🔊", title: "Sound Sequence" },
  "rhyme":     { emoji: "🎵", title: "Rhyme Matcher" },
  "beginning": { emoji: "🔤", title: "Beginning Sound" },
};

export default function MemoryChallengePage() {
  const { speak }  = useTTS();
  const { user }   = useAuth();
  const router     = useRouter();
  const { session, recordSequence, recordRhyme, getDuration, reset } = useMemorySession();
  const { data: dashboardData, refetch: refetchDashboard } = useDashboardData(user?.id);

  // Which mini-game in the sequence we are on (0 = first, 2 = last)
  const [gameIndex, setGameIndex] = useState(0);
  // "playing" | "between" | "complete"
  const [phase, setPhase]         = useState<"playing" | "between" | "complete">("playing");

  const [difficulty, setDifficulty] = useState(1);
  const [aiMessage, setAiMessage]   = useState("");
  const [newBadges, setNewBadges]   = useState<NewBadge[]>([]);
  const [roundKey, setRoundKey]     = useState(0);

  const { dynamicLevel, peekLoading, nextLevelReady, peekPool, consumeAndPreload, clearLevel } =
    usePoolGame<MemoryLevel>("memory_challenge", user?.id);

  useEffect(() => {
    if (dashboardData?.profile?.currentDifficulty?.memory) {
      setDifficulty(dashboardData.profile.currentDifficulty.memory);
    }
  }, [dashboardData?.profile?.currentDifficulty?.memory]);

  // On mount: silently fetch AI content in background — static data plays immediately
  useEffect(() => {
    peekPool(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const staticLevel = getMemoryLevel(difficulty);
  const activeLevel = dynamicLevel ?? staticLevel;
  // Force mini-game remount when AI content arrives — their useState initializers
  // only run once at mount, so changing the key is the only way to get new content.
  const levelSource = dynamicLevel ? "ai" : "static";
  const xp = calculateXP(session.sequenceAccuracy, difficulty, session.attempts);

  // Called when a single mini-game finishes all its questions
  const handleMiniGameComplete = () => {
    if (gameIndex + 1 < GAME_SEQUENCE.length) {
      setPhase("between");
    } else {
      // All 3 done — submit and show final screen
      setPhase("complete");

      // Consume current pool item + preload next immediately
      consumeAndPreload();

      api.post("/api/games/session", {
        studentId: user?.id,
        gameType: "memory_challenge",
        score: session.score,
        accuracy: session.sequenceAccuracy,
        duration: getDuration(),
        attempts: session.attempts,
        mistakeLog: [],
        confusionMatrix: {},
        maxSequenceRecalled: session.maxSequenceRecalled,
        sequenceAccuracy: session.sequenceAccuracy,
        rhymeScore: session.rhymeScore,
      })
      .then((res) => {
        if (res.data?.encouragementMessage) {
          setAiMessage(res.data.encouragementMessage);
          speak(res.data.encouragementMessage);
        }
        if (res.data?.newBadges?.length) {
          setNewBadges(res.data.newBadges);
          speak(`You earned the ${res.data.newBadges[0].name} badge!`);
        }
        refetchDashboard();
      })
      .catch(() => {});
    }
  };

  const goToNextGame = () => {
    setGameIndex((i) => i + 1);
    setPhase("playing");
  };

  const restartSequence = () => {
    reset();
    clearLevel();            // clear stale level so peek re-loads the preloaded item
    setGameIndex(0);
    setRoundKey((k) => k + 1);
    setPhase("playing");
    setAiMessage("");
    setNewBadges([]);
    peekPool(true);          // showSpinner=true: dynamicLevel was cleared, gate until AI loads
  };

  const currentGame = GAME_SEQUENCE[gameIndex];

  return (
    <div className="min-h-screen bg-surface-warm text-ink">
      <header className="border-b border-border-subtle/80 bg-surface/90">
        <PageContainer className="flex min-h-16 items-center gap-3 py-3">
          <Link
            href="/dashboard/student"
            aria-label="Back to student dashboard"
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-control border border-border-subtle bg-surface-soft text-indigo-800 transition-colors hover:bg-lavender-pastel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-lavender-pastel text-2xl" aria-hidden="true">🧠</span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-indigo-950 sm:text-2xl">Memory Challenge</h1>
            <p className="text-sm leading-relaxed text-muted sm:text-base">Train your sound memory!</p>
          </div>
          <button
            type="button"
            onClick={() => speak("Welcome to Memory Challenge! Complete all three games to finish the challenge.")}
            className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sunshine-accent/60 bg-sunshine-pastel text-amber-800 transition-colors hover:bg-sunshine-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            aria-label="Read Memory Challenge instructions"
          >
            <Volume2 size={20} aria-hidden="true" />
          </button>
        </PageContainer>
      </header>

      <div>
        <PageContainer className="py-6 sm:py-8">
          {phase !== "complete" && (
            <nav className="mb-5" aria-label="Memory Challenge progress">
              <ol className="grid grid-cols-3 gap-2 sm:gap-4">
                {GAME_SEQUENCE.map((g, i) => {
                  const done = i < gameIndex;
                  const active = i === gameIndex;
                  return (
                    <li key={g} aria-current={active ? "step" : undefined} className="min-w-0">
                      <div className="mb-2 h-2 overflow-hidden rounded-full bg-lavender-pastel">
                        <div className={`h-full rounded-full transition-[width] motion-reduce:transition-none ${
                          done ? "w-full bg-emerald-700" : active ? "w-full bg-indigo-700" : "w-0"
                        }`} />
                      </div>
                      <p className={`truncate text-center text-xs font-semibold leading-snug sm:text-sm ${
                        done ? "text-success" : active ? "text-indigo-900" : "text-muted"
                      }`}>
                        <span aria-hidden="true">{done ? "✓ " : `${GAME_META[g].emoji} `}</span>
                        {GAME_META[g].title}
                        {active && <span className="sr-only">, current activity</span>}
                      </p>
                    </li>
                  );
                })}
              </ol>
            </nav>
          )}

          {phase === "playing" && (
            <div className="mb-5 grid grid-cols-2 gap-3 sm:mx-auto sm:max-w-lg sm:gap-4">
              <div className="rounded-panel border border-mint-accent/50 bg-mint-pastel px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">Score</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-indigo-950">{session.score}</p>
              </div>
              <div className="rounded-panel border border-lavender-accent/50 bg-lavender-pastel px-4 py-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">Best sequence</p>
                <p className="mt-1 text-xl font-bold tabular-nums text-indigo-950">{session.maxSequenceRecalled}</p>
              </div>
            </div>
          )}

          <div className="mx-auto w-full max-w-5xl">
            <AnimatePresence mode="wait">
              {phase === "playing" && peekLoading && (
                <motion.div
                  key="peek-loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex min-h-72 flex-col items-center justify-center gap-4"
                  role="status"
                  aria-live="polite"
                >
                  <LoaderCircle className="h-10 w-10 animate-spin text-indigo-700 motion-reduce:animate-none" aria-hidden="true" />
                  <p className="text-base font-semibold text-indigo-900">Loading your challenge...</p>
                </motion.div>
              )}

              {phase === "playing" && !peekLoading && currentGame === "sequence" && (
                <motion.div key={`seq-${roundKey}-${levelSource}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Surface padding="md" className="sm:p-8">
                    <SoundSequence items={activeLevel.sequenceItems} minLength={activeLevel.minSequenceLength}
                      maxLength={activeLevel.maxSequenceLength} onResult={recordSequence}
                      onRoundComplete={handleMiniGameComplete} />
                  </Surface>
                </motion.div>
              )}

              {phase === "playing" && !peekLoading && currentGame === "rhyme" && (
                <motion.div key={`rhyme-${roundKey}-${levelSource}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Surface padding="md" className="sm:p-8">
                    <RhymeMatcher pairs={activeLevel.rhymePairs} onResult={recordRhyme}
                      onRoundComplete={handleMiniGameComplete} />
                  </Surface>
                </motion.div>
              )}

              {phase === "playing" && !peekLoading && currentGame === "beginning" && (
                <motion.div key={`beg-${roundKey}-${levelSource}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <Surface padding="md" className="sm:p-8">
                    <BeginningStart sounds={activeLevel.beginningSound} onResult={recordRhyme}
                      onRoundComplete={handleMiniGameComplete} />
                  </Surface>
                </motion.div>
              )}

              {phase === "between" && (
                <motion.div key="between" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                  <Surface padding="lg" className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 text-center sm:gap-6">
                    <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sunshine-pastel text-4xl" aria-hidden="true">🌟</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Activity complete</p>
                      <h2 className="mt-2 text-2xl font-bold tracking-tight text-indigo-950">{GAME_META[currentGame].title} Complete!</h2>
                      <p className="mt-2 text-base leading-relaxed text-muted">
                        Game {gameIndex + 1} of {GAME_SEQUENCE.length} done. Ready for the next one?
                      </p>
                    </div>
                    <div className="flex w-full items-center gap-3 rounded-control border border-lavender-accent/50 bg-lavender-pastel px-4 py-4 text-left sm:w-auto sm:px-6">
                      <span className="text-3xl" aria-hidden="true">{GAME_META[GAME_SEQUENCE[gameIndex + 1]].emoji}</span>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">Up next</p>
                        <p className="text-lg font-bold text-indigo-950">{GAME_META[GAME_SEQUENCE[gameIndex + 1]].title}</p>
                      </div>
                    </div>
                    <Button size="lg" className="w-full sm:w-auto sm:min-w-56" onClick={goToNextGame}>
                      Next activity <span aria-hidden="true">→</span>
                    </Button>
                  </Surface>
                </motion.div>
              )}

              {phase === "complete" && (
                <motion.div key="complete" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto w-full max-w-3xl">
                  <Surface padding="lg" className="flex flex-col items-center gap-5 text-center sm:gap-6">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Challenge complete</p>
                      <h2 className="mt-2 text-3xl font-bold tracking-tight text-indigo-950">Memory Master!</h2>
                    </div>
                    <div className="flex gap-3" role="img" aria-label={`${session.sequenceAccuracy >= 90 ? 3 : session.sequenceAccuracy >= 60 ? 2 : 1} out of 3 stars`}>
                      {[1, 2, 3].map((n) => (
                        <Star
                          key={n}
                          size={40}
                          aria-hidden="true"
                          className={n <= (session.sequenceAccuracy >= 90 ? 3 : session.sequenceAccuracy >= 60 ? 2 : 1)
                            ? "fill-sunshine-accent text-amber-700" : "fill-indigo-100 text-indigo-300"}
                        />
                      ))}
                    </div>
                    <p className="text-lg leading-relaxed text-indigo-900">
                      Best sequence: <strong>{session.maxSequenceRecalled}</strong> in a row! 🎉
                    </p>

                    {newBadges.length > 0 && (
                      <div className="w-full rounded-panel border border-sunshine-accent/60 bg-sunshine-pastel/70 p-4">
                        <p className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-900">
                          🏅 Badge{newBadges.length > 1 ? "s" : ""} unlocked!
                        </p>
                        <div className="flex flex-wrap justify-center gap-3">
                          {newBadges.map((b, i) => (
                            <motion.div
                              key={b.badgeId}
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: i * 0.12, type: "spring" }}
                              className="flex min-w-24 flex-col items-center gap-2 rounded-control border border-sunshine-accent/50 bg-surface px-4 py-3"
                            >
                              <span className="text-4xl" aria-hidden="true">{b.emoji}</span>
                              <span className="text-sm font-bold leading-tight text-indigo-900">{b.name}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                    {aiMessage && (
                      <p className="w-full rounded-control border border-sky-accent/50 bg-sky-pastel p-4 text-left text-base leading-relaxed text-indigo-900" role="status" aria-live="polite">
                        <span aria-hidden="true">🤖 </span>{aiMessage}
                      </p>
                    )}
                    <div className="grid w-full grid-cols-2 gap-3">
                      <div className="rounded-control border border-mint-accent/50 bg-mint-pastel p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">Score</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-950">{session.score}</p>
                      </div>
                      <div className="rounded-control border border-lavender-accent/50 bg-lavender-pastel p-4">
                        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">XP earned</p>
                        <p className="mt-1 text-2xl font-bold tabular-nums text-indigo-950">+{xp}</p>
                      </div>
                    </div>
                    <div className="flex w-full flex-col gap-3 sm:max-w-md sm:flex-row">
                      <Button
                        size="lg"
                        className="flex-1"
                        onClick={() => { if (nextLevelReady) restartSequence(); }}
                        disabled={!nextLevelReady}
                      >
                        {nextLevelReady ? "Play Again" : "Loading next level..."}
                      </Button>
                      <Button variant="secondary" size="lg" className="flex-1" onClick={() => router.push("/dashboard/student")}>
                        Home
                      </Button>
                    </div>
                  </Surface>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </PageContainer>
      </div>
    </div>
  );
}
