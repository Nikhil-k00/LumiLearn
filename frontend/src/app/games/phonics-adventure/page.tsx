"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePhonicsSession } from "@/hooks/usePhonicsSession";
import { useTTS } from "@/hooks/useTTS";
import { useDashboardData } from "@/hooks/useDashboardData";
import { usePoolGame } from "@/hooks/usePoolGame";
import { getPhonicsLevel, type PhonicsLevel } from "@/data/phonics-content";
import { SoundMatchGame }    from "@/components/games/phonics/SoundMatchGame";
import { BuildAWordGame }    from "@/components/games/phonics/BuildAWordGame";
import { MissingLetterGame } from "@/components/games/phonics/MissingLetterGame";
import { GameComplete, type NewBadge } from "@/components/games/phonics/GameComplete";
import { calculateXP }       from "@/lib/gamification";
import { Volume2, ArrowLeft, Check, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { PageContainer } from "@/components/ui/PageContainer";
import { Surface } from "@/components/ui/Surface";

// Sequential order of the 3 mini-games within this section
const GAME_SEQUENCE = ["sound-match", "build-word", "missing-letter"] as const;
type MiniGame = typeof GAME_SEQUENCE[number];

const GAME_META: Record<MiniGame, { emoji: string; title: string }> = {
  "sound-match":    { emoji: "🔊", title: "Sound Match" },
  "build-word":     { emoji: "🧱", title: "Build a Word" },
  "missing-letter": { emoji: "❓", title: "Missing Letter" },
};

export default function PhonicsAdventurePage() {
  const { speak }                        = useTTS();
  const { user }                         = useAuth();
  const router                           = useRouter();
  const { session, recordAnswer, getDuration, reset } = usePhonicsSession();
  const { data: dashboardData, refetch: refetchDashboard } = useDashboardData(user?.id);

  // Which mini-game in the sequence we are on (0 = first, 2 = last)
  const [gameIndex, setGameIndex]        = useState(0);
  // "playing" = inside a mini-game, "between" = mini-game done, show Next prompt, "complete" = all 3 done
  const [phase, setPhase]                = useState<"playing" | "between" | "complete">("playing");

  const [difficulty, setDifficulty]      = useState(1);
  const [topConfusions, setTopConfusions]= useState<string[]>([]);
  const [aiMessage, setAiMessage]        = useState("");
  const [newBadges, setNewBadges]        = useState<NewBadge[]>([]);
  const [roundKey, setRoundKey]          = useState(0);

  const { dynamicLevel, peekLoading, nextLevelReady, peekPool, consumeAndPreload, clearLevel } =
    usePoolGame<PhonicsLevel>("phonics_adventure", user?.id);

  // Set difficulty from dashboard data when it loads
  useEffect(() => {
    if (dashboardData?.profile?.currentDifficulty?.phonics) {
      setDifficulty(dashboardData.profile.currentDifficulty.phonics);
    }
  }, [dashboardData?.profile?.currentDifficulty?.phonics]);

  // On mount: silently fetch AI content in background — static data plays immediately
  useEffect(() => {
    peekPool(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const staticLevel = getPhonicsLevel(difficulty);
  // Use AI content if loaded, otherwise static fallback.
  const activeLevel = dynamicLevel ?? staticLevel;
  // Track whether we have AI content so mini-game keys can change when it arrives.
  // Mini-games capture `words` in their useState initializer (runs once at mount),
  // so we must force a remount when dynamicLevel first becomes available.
  const levelSource = dynamicLevel ? "ai" : "static";
  const xp = calculateXP(session.accuracy, difficulty, session.attempts);

  // Called when a single mini-game finishes all its questions
  const handleMiniGameComplete = () => {
    if (gameIndex + 1 < GAME_SEQUENCE.length) {
      // More mini-games left — show "Next Game" prompt
      setPhase("between");
    } else {
      // All 3 done — compute confusions, submit, show final screen
      const pairs: Record<string, number> = {};
      for (const [key, count] of Object.entries(session.confusionMatrix)) {
        const parts = key.split("_for_");
        if (parts.length === 2) {
          const pair = [parts[0], parts[1]].sort().join("/");
          pairs[pair] = (pairs[pair] ?? 0) + count;
        }
      }
      setTopConfusions(Object.entries(pairs).sort(([, a], [, b]) => b - a).map(([p]) => p).slice(0, 2));
      setPhase("complete");

      // Consume current pool item + preload next immediately — independent of
      // session submit. This way the next visit to this section shows a new game
      // even if the student goes home instead of clicking Play Again.
      consumeAndPreload();

      api.post("/api/games/session", {
        studentId: user?.id,
        gameType: "phonics_adventure",
        score: session.score,
        accuracy: session.accuracy,
        duration: getDuration(),
        attempts: session.attempts,
        mistakeLog: session.mistakeLog,
        confusionMatrix: session.confusionMatrix,
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

  // Advance to the next mini-game in the sequence
  const goToNextGame = () => {
    setGameIndex((i) => i + 1);
    setPhase("playing");
  };

  // Restart the full 3-game sequence — new content already preloaded by consumeAndPreload
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
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-pastel text-2xl" aria-hidden="true">🔤</span>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight tracking-tight text-indigo-950 sm:text-2xl">Phonics Adventure</h1>
            <p className="text-sm leading-relaxed text-muted sm:text-base">Let&apos;s learn sounds together!</p>
          </div>
          <button
            type="button"
            onClick={() => speak("Welcome to Phonics Adventure! Complete all three games to finish the adventure.")}
            className="ml-auto inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sunshine-accent/60 bg-sunshine-pastel text-amber-800 transition-colors hover:bg-sunshine-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            aria-label="Read instructions"
          >
            <Volume2 size={20} aria-hidden="true" />
          </button>
        </PageContainer>
      </header>

      <PageContainer className="py-6 sm:py-8">
        {phase !== "complete" && (
          <nav className="mb-5" aria-label="Adventure progress">
            <ol className="grid grid-cols-3 gap-2 sm:gap-3">
              {GAME_SEQUENCE.map((game, index) => {
                const done = index < gameIndex;
                const active = index === gameIndex;
                return (
                  <li key={game} aria-current={active ? "step" : undefined}>
                    <div className={`flex min-h-12 items-center justify-center gap-2 rounded-control border px-2 py-2 text-center text-xs font-semibold leading-tight tracking-normal sm:text-sm ${
                      done
                        ? "border-mint-accent/50 bg-mint-pastel text-indigo-900"
                        : active
                          ? "border-lavender-accent bg-lavender-pastel text-indigo-950"
                          : "border-border-subtle bg-surface text-muted"
                    }`}>
                      {done ? <Check size={16} aria-hidden="true" /> : <span className="text-base" aria-hidden="true">{GAME_META[game].emoji}</span>}
                      <span className="hidden sm:inline">{GAME_META[game].title}</span>
                      <span className="sm:hidden">{index + 1} / {GAME_SEQUENCE.length}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-soft" aria-hidden="true">
                      <div className={`h-full rounded-full ${done ? "w-full bg-mint-accent" : active ? "w-2/3 bg-lavender-accent" : "w-0"}`} />
                    </div>
                  </li>
                );
              })}
            </ol>
          </nav>
        )}

        {phase === "playing" && (
          <div className="mx-auto mb-5 grid w-full max-w-4xl grid-cols-2 gap-3 sm:gap-4" aria-label="Round results">
            <Surface padding="sm" className="text-center">
              <p className="text-xs font-semibold text-muted">Score</p>
              <p className="text-xl font-bold text-indigo-950" aria-live="polite">{session.score}</p>
            </Surface>
            <Surface padding="sm" className="text-center">
              <p className="text-xs font-semibold text-muted">Accuracy</p>
              <p className="text-xl font-bold text-indigo-950" aria-live="polite">{session.accuracy}%</p>
            </Surface>
          </div>
        )}

        <div className="mx-auto w-full max-w-4xl">
          <AnimatePresence mode="wait">
            {phase === "playing" && peekLoading && (
              <motion.div
                key="peek-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex min-h-64 flex-col items-center justify-center gap-4"
                role="status"
                aria-live="polite"
              >
                <span className="text-5xl" aria-hidden="true">🌟</span>
                <p className="text-base font-semibold text-indigo-900">Loading your adventure...</p>
                <LoaderCircle size={22} className="animate-spin text-indigo-700 motion-reduce:animate-none" aria-hidden="true" />
              </motion.div>
            )}

            {phase === "playing" && !peekLoading && currentGame === "sound-match" && (
              <motion.div key={`sm-${roundKey}-${levelSource}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <SoundMatchGame words={activeLevel.words} onAnswer={recordAnswer} onRoundComplete={handleMiniGameComplete} />
              </motion.div>
            )}

            {phase === "playing" && !peekLoading && currentGame === "build-word" && (
              <motion.div key={`bw-${roundKey}-${levelSource}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <BuildAWordGame words={activeLevel.words} onAnswer={recordAnswer} onRoundComplete={handleMiniGameComplete} />
              </motion.div>
            )}

            {phase === "playing" && !peekLoading && currentGame === "missing-letter" && (
              <motion.div key={`ml-${roundKey}-${levelSource}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <MissingLetterGame
                  words={activeLevel.words}
                  confusionPairs={activeLevel.confusionPairs}
                  onAnswer={recordAnswer}
                  onRoundComplete={handleMiniGameComplete}
                />
              </motion.div>
            )}

            {phase === "between" && (
              <motion.div
                key="between"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto w-full max-w-2xl"
              >
                <Surface padding="lg" className="flex flex-col items-center gap-5 text-center">
                  <span className="text-5xl" aria-hidden="true">🌟</span>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-indigo-950">
                      {GAME_META[currentGame].title} complete!
                    </h2>
                    <p className="mt-2 text-base leading-relaxed text-muted">
                      Game {gameIndex + 1} of {GAME_SEQUENCE.length} done. Ready for the next one?
                    </p>
                  </div>
                  <div className="flex w-full max-w-sm items-center gap-4 rounded-panel border border-lavender-accent/40 bg-lavender-pastel p-4 text-left">
                    <span className="text-4xl" aria-hidden="true">{GAME_META[GAME_SEQUENCE[gameIndex + 1]].emoji}</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wide text-indigo-700">Up next</p>
                      <p className="text-lg font-bold text-indigo-950">{GAME_META[GAME_SEQUENCE[gameIndex + 1]].title}</p>
                    </div>
                  </div>
                  <Button size="lg" className="w-full max-w-sm" onClick={goToNextGame}>
                    Next Game <span aria-hidden="true">→</span>
                  </Button>
                </Surface>
              </motion.div>
            )}

            {phase === "complete" && (
              <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <GameComplete
                  score={session.score}
                  accuracy={session.accuracy}
                  xpEarned={xp}
                  topConfusions={topConfusions}
                  aiMessage={aiMessage}
                  newBadges={newBadges}
                  nextLevelReady={nextLevelReady}
                  onPlayAgain={restartSequence}
                  onGoHome={() => router.push("/dashboard/student")}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </PageContainer>
    </div>
  );
}
