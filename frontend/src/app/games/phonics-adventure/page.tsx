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
import { Volume2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

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

  const { dynamicLevel, peekLoading, nextLevelReady, fetchFromPool, clearLevel } =
    usePoolGame<PhonicsLevel>("phonics_adventure", user?.id);

  // Set difficulty from dashboard data when it loads
  useEffect(() => {
    if (dashboardData?.profile?.currentDifficulty?.phonics) {
      setDifficulty(dashboardData.profile.currentDifficulty.phonics);
    }
  }, [dashboardData?.profile?.currentDifficulty?.phonics]);

  // On mount: try pool once but don't block — static data plays immediately
  useEffect(() => {
    fetchFromPool(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const staticLevel = getPhonicsLevel(difficulty);
  // Use AI content if loaded, otherwise static fallback.
  // peekLoading=true means the peek is still in-flight — mini-games are gated
  // below so they never mount with stale staticLevel data.
  const activeLevel = dynamicLevel ?? staticLevel;
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
          // Announce the first badge by voice
          speak(`You earned the ${res.data.newBadges[0].name} badge!`);
        }
        refetchDashboard();
        // Poll pool until AI-generated game is ready — button auto-lights up
        fetchFromPool(false);
      })
      .catch(() => fetchFromPool(false));
    }
  };

  // Advance to the next mini-game in the sequence
  const goToNextGame = () => {
    setGameIndex((i) => i + 1);
    setPhase("playing");
  };

  // Restart the full 3-game sequence from the beginning
  const restartSequence = () => {
    reset();
    clearLevel();            // drop stale AI level so next pool item loads fresh
    setGameIndex(0);
    setRoundKey((k) => k + 1);
    setPhase("playing");
    setAiMessage("");
    setNewBadges([]);
    fetchFromPool(false);    // consume next pool item — student played, earn fresh AI game
  };

  const currentGame = GAME_SEQUENCE[gameIndex];

  return (
    <div className="min-h-screen bg-page px-4 py-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-lg flex items-center gap-3 mb-6">
        <Link href="/dashboard/student" className="p-2 rounded-full bg-lavender-pastel border border-lavender-accent">
          <ArrowLeft size={20} className="text-indigo-700" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-3xl">🔤</span>
          <div>
            <h1 className="text-xl font-bold text-indigo-900 leading-tight">Phonics Adventure</h1>
            <p className="text-base text-indigo-500">Let&apos;s learn sounds together!</p>
          </div>
        </div>
        <button
          onClick={() => speak("Welcome to Phonics Adventure! Complete all three games to finish the adventure.")}
          className="ml-auto p-2 rounded-full bg-sunshine-pastel border border-sunshine-accent"
          aria-label="Read instructions"
        >
          <Volume2 size={20} className="text-amber-600" />
        </button>
      </div>

      {/* Sequential progress indicator — shown during play and between games */}
      {phase !== "complete" && (
        <div className="w-full max-w-lg flex items-center gap-2 mb-5">
          {GAME_SEQUENCE.map((g, i) => {
            const done    = i < gameIndex;
            const active  = i === gameIndex;
            return (
              <div key={g} className="flex-1 flex flex-col items-center gap-1">
                <div className={`w-full h-2 rounded-full transition-all ${
                  done   ? "bg-mint-accent" :
                  active ? "bg-lavender-accent" :
                           "bg-lavender-pastel"
                }`} />
                <span className={`text-[11px] font-semibold ${
                  done   ? "text-mint-accent" :
                  active ? "text-lavender-accent" :
                           "text-indigo-300"
                }`}>
                  {GAME_META[g].emoji} {GAME_META[g].title}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Stats bar — visible while playing */}
      {phase === "playing" && (
        <div className="w-full max-w-lg flex gap-3 mb-4">
          <div className="flex-1 rounded-xl bg-mint-pastel px-4 py-2 text-center">
            <p className="text-[11px] text-mint-accent font-semibold">Score</p>
            <p className="text-lg font-bold text-indigo-900">{session.score}</p>
          </div>
          <div className="flex-1 rounded-xl bg-lavender-pastel px-4 py-2 text-center">
            <p className="text-[11px] text-lavender-accent font-semibold">Accuracy</p>
            <p className="text-lg font-bold text-indigo-900">{session.accuracy}%</p>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">

          {/* ── Brief loading gate — waits for peek before mounting mini-games ── */}
          {phase === "playing" && peekLoading && (
            <motion.div key="peek-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-16">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="text-5xl">🌟</motion.div>
              <p className="text-base text-indigo-400">Loading your adventure...</p>
            </motion.div>
          )}

          {/* ── Active mini-game ─────────────────────────────────────────── */}
          {phase === "playing" && !peekLoading && currentGame === "sound-match" && (
            <motion.div key={`sm-${roundKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SoundMatchGame
                words={activeLevel.words}
                onAnswer={recordAnswer}
                onRoundComplete={handleMiniGameComplete}
              />
            </motion.div>
          )}

          {phase === "playing" && !peekLoading && currentGame === "build-word" && (
            <motion.div key={`bw-${roundKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <BuildAWordGame
                words={activeLevel.words}
                onAnswer={recordAnswer}
                onRoundComplete={handleMiniGameComplete}
              />
            </motion.div>
          )}

          {phase === "playing" && !peekLoading && currentGame === "missing-letter" && (
            <motion.div key={`ml-${roundKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <MissingLetterGame
                words={activeLevel.words}
                confusionPairs={activeLevel.confusionPairs}
                onAnswer={recordAnswer}
                onRoundComplete={handleMiniGameComplete}
              />
            </motion.div>
          )}

          {/* ── Between games — "Next Game" prompt ──────────────────────── */}
          {phase === "between" && (
            <motion.div key="between" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6 bg-white rounded-card p-8 shadow-card border border-mint-accent/20 text-center">
              <span className="text-5xl">🌟</span>
              <h2 className="text-2xl font-bold text-indigo-900">
                {GAME_META[currentGame].title} Complete!
              </h2>
              <p className="text-base text-indigo-600">
                Game {gameIndex + 1} of {GAME_SEQUENCE.length} done. Ready for the next one?
              </p>
              {/* Next game preview */}
              <div className="flex items-center gap-3 bg-lavender-pastel rounded-xl px-6 py-4 border border-lavender-accent/40">
                <span className="text-4xl">{GAME_META[GAME_SEQUENCE[gameIndex + 1]].emoji}</span>
                <div className="text-left">
                  <p className="text-[11px] text-lavender-accent font-semibold uppercase tracking-wide">Up next</p>
                  <p className="text-lg font-bold text-indigo-900">{GAME_META[GAME_SEQUENCE[gameIndex + 1]].title}</p>
                </div>
              </div>
              <button
                onClick={goToNextGame}
                className="w-full py-4 rounded-button bg-lavender-accent text-white font-bold text-xl shadow-btn">
                Next Game →
              </button>
            </motion.div>
          )}

          {/* ── All 3 complete ──────────────────────────────────────────── */}
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
    </div>
  );
}
