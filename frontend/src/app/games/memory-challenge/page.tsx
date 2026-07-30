"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Star } from "lucide-react";
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
    <div className="min-h-screen bg-page px-4 py-6 flex flex-col items-center">
      <div className="w-full max-w-lg flex items-center gap-3 mb-6">
        <Link href="/dashboard/student" className="p-2 rounded-full bg-lavender-pastel border border-lavender-accent">
          <ArrowLeft size={20} className="text-indigo-700" />
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-3xl">🧠</span>
          <div>
            <h1 className="text-xl font-bold text-indigo-900 leading-tight">Memory Challenge</h1>
            <p className="text-base text-indigo-500">Train your sound memory!</p>
          </div>
        </div>
        <button onClick={() => speak("Welcome to Memory Challenge! Complete all three games to finish the challenge.")}
          className="ml-auto p-2 rounded-full bg-sunshine-pastel border border-sunshine-accent">
          <Volume2 size={20} className="text-amber-600" />
        </button>
      </div>

      {/* Sequential progress indicator */}
      {phase !== "complete" && (
        <div className="w-full max-w-lg flex items-center gap-2 mb-5">
          {GAME_SEQUENCE.map((g, i) => {
            const done   = i < gameIndex;
            const active = i === gameIndex;
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
            <p className="text-[11px] text-lavender-accent font-semibold">Best Seq</p>
            <p className="text-lg font-bold text-indigo-900">{session.maxSequenceRecalled}</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-lg">
        <AnimatePresence mode="wait">

          {/* ── Brief loading gate — waits for peek before mounting mini-games ── */}
          {phase === "playing" && peekLoading && (
            <motion.div key="peek-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-4 py-16">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="text-5xl">🧠</motion.div>
              <p className="text-base text-indigo-400">Loading your challenge...</p>
            </motion.div>
          )}

          {/* ── Active mini-game ─────────────────────────────────────────── */}
          {phase === "playing" && !peekLoading && currentGame === "sequence" && (
            <motion.div key={`seq-${roundKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <SoundSequence items={activeLevel.sequenceItems} minLength={activeLevel.minSequenceLength}
                maxLength={activeLevel.maxSequenceLength} onResult={recordSequence}
                onRoundComplete={handleMiniGameComplete} />
            </motion.div>
          )}

          {phase === "playing" && !peekLoading && currentGame === "rhyme" && (
            <motion.div key={`rhyme-${roundKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <RhymeMatcher pairs={activeLevel.rhymePairs} onResult={recordRhyme}
                onRoundComplete={handleMiniGameComplete} />
            </motion.div>
          )}

          {phase === "playing" && !peekLoading && currentGame === "beginning" && (
            <motion.div key={`beg-${roundKey}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <BeginningStart sounds={activeLevel.beginningSound} onResult={recordRhyme}
                onRoundComplete={handleMiniGameComplete} />
            </motion.div>
          )}

          {/* ── Between games — "Next Game" prompt ──────────────────────── */}
          {phase === "between" && (
            <motion.div key="between" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6 bg-white rounded-card p-8 shadow-card border border-lavender-accent/20 text-center">
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
            <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-6 bg-white rounded-card p-8 shadow-card border border-lavender-accent/20 text-center">
              <h2 className="text-2xl font-bold text-indigo-900">🧠 Memory Master!</h2>
              <div className="flex gap-2">
                {[1,2,3].map((n) => (
                  <Star key={n} size={40}
                    className={n <= (session.sequenceAccuracy >= 90 ? 3 : session.sequenceAccuracy >= 60 ? 2 : 1)
                      ? "text-sunshine-accent fill-sunshine-accent" : "text-indigo-200 fill-indigo-100"} />
                ))}
              </div>
              <p className="text-xl text-indigo-700">Best sequence: <strong>{session.maxSequenceRecalled}</strong> in a row! 🎉</p>
              {/* New badges */}
              {newBadges.length > 0 && (
                <div className="w-full rounded-2xl bg-sunshine-pastel border-2 border-sunshine-accent/60 p-4">
                  <p className="text-[13px] font-bold text-amber-700 uppercase tracking-wide mb-3">
                    🏅 Badge{newBadges.length > 1 ? "s" : ""} Unlocked!
                  </p>
                  <div className="flex flex-wrap gap-3 justify-center">
                    {newBadges.map((b, i) => (
                      <motion.div key={b.badgeId}
                        initial={{ scale: 0 }} animate={{ scale: 1 }}
                        transition={{ delay: i * 0.12, type: "spring" }}
                        className="flex flex-col items-center gap-1 bg-white rounded-xl px-4 py-3 border border-sunshine-accent/40 shadow-sm min-w-[80px]">
                        <span className="text-4xl">{b.emoji}</span>
                        <span className="text-[12px] font-bold text-indigo-800 text-center leading-tight">{b.name}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
              {aiMessage && (
                <p className="text-base font-medium text-indigo-700 bg-sky-pastel p-3 rounded-xl border border-sky-accent/40 w-full text-left">
                  🤖 {aiMessage}
                </p>
              )}
              <div className="grid grid-cols-2 gap-3 w-full">
                <div className="rounded-xl bg-mint-pastel p-3">
                  <p className="text-[11px] text-mint-accent font-semibold">Score</p>
                  <p className="text-xl font-bold text-indigo-900">{session.score}</p>
                </div>
                <div className="rounded-xl bg-lavender-pastel p-3">
                  <p className="text-[11px] text-lavender-accent font-semibold">+XP</p>
                  <p className="text-xl font-bold text-indigo-900">{xp}</p>
                </div>
              </div>
              <div className="flex gap-3 w-full max-w-sm mt-4">
                <button
                  onClick={() => { if (nextLevelReady) restartSequence(); }}
                  disabled={!nextLevelReady}
                  className={`flex-1 py-3 rounded-button font-semibold text-lg transition-all
                    ${nextLevelReady ? "bg-mint-accent text-white shadow-btn-mint" : "bg-mint-pastel text-mint-accent border-2 border-mint-accent cursor-wait opacity-80"}`}>
                  {nextLevelReady ? "Play Again" : "⏳ Loading next level..."}
                </button>
                <button onClick={() => router.push("/dashboard/student")}
                  className="flex-1 py-3 rounded-button bg-lavender-pastel text-indigo-800 font-semibold text-lg border border-lavender-accent">
                  Home
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
