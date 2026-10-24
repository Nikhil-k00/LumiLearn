"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Surface } from "@/components/ui/Surface";

export interface NewBadge {
  badgeId:     string;
  name:        string;
  emoji:       string;
  description: string;
}

interface GameCompleteProps {
  score: number;
  accuracy: number;
  xpEarned: number;
  topConfusions: string[];      // e.g. ["b/d", "p/q"]
  aiMessage?: string;           // message from AI
  newBadges?: NewBadge[];       // badges earned this session
  nextLevelReady?: boolean;     // false while GPT is generating next level
  onPlayAgain: () => void;
  onGoHome: () => void;
}

function starCount(accuracy: number) {
  if (accuracy >= 90) return 3;
  if (accuracy >= 60) return 2;
  return 1;
}

const encouragements: Record<number, { title: string; body: string }> = {
  3: { title: "⭐ Amazing job!", body: "You are a phonics superstar! Keep it up!" },
  2: { title: "🌟 Great work!",  body: "You did really well. A bit more practice and you'll be unstoppable!" },
  1: { title: "💪 You tried!",   body: "Every attempt makes you stronger. Let's keep practising together!" },
};

export function GameComplete({ score, accuracy, xpEarned, topConfusions, aiMessage, newBadges = [], nextLevelReady = true, onPlayAgain, onGoHome }: GameCompleteProps) {
  const stars   = starCount(accuracy);
  const message = encouragements[stars];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto w-full max-w-2xl"
    >
      <Surface padding="lg" className="flex flex-col items-center gap-5 text-center sm:gap-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-700">Adventure complete</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-indigo-950">{message.title}</h2>
        </div>

        {/* Stars */}
        <div className="flex gap-3" role="img" aria-label={`${stars} out of 3 stars`}>
          {[1, 2, 3].map((n) => (
            <motion.div
              key={n}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: n * 0.08 }}
              aria-hidden="true"
            >
              <Star
                size={40}
                className={n <= stars ? "fill-sunshine-accent text-amber-700" : "fill-indigo-100 text-indigo-300"}
              />
            </motion.div>
          ))}
        </div>

        <p className="max-w-xl text-base leading-relaxed text-muted" role="status" aria-live="polite">{message.body}</p>

        {/* ── New badges earned this session ──────────────────────── */}
        <AnimatePresence>
          {newBadges.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-panel border border-sunshine-accent/60 bg-sunshine-pastel/70 p-4"
            >
              <p className="mb-3 text-sm font-bold uppercase tracking-wide text-amber-900">
                🏅 Badge{newBadges.length > 1 ? "s" : ""} unlocked!
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {newBadges.map((badge) => (
                  <div
                    key={badge.badgeId}
                    className="flex min-w-24 flex-col items-center gap-2 rounded-control border border-sunshine-accent/50 bg-white px-4 py-3"
                  >
                    <span className="text-4xl" aria-hidden="true">{badge.emoji}</span>
                    <span className="text-sm font-bold leading-tight text-indigo-900">{badge.name}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {aiMessage && (
          <p className="w-full rounded-control border border-sky-accent/50 bg-sky-pastel p-4 text-left text-base leading-relaxed text-indigo-900" role="status" aria-live="polite">
            <span aria-hidden="true">🤖 </span>{aiMessage}
          </p>
        )}

        {/* Stats */}
        <div className="grid w-full grid-cols-2 gap-3">
          <div className="rounded-control border border-mint-accent/50 bg-mint-pastel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">Score</p>
            <p className="mt-1 text-2xl font-bold text-indigo-950">{score}</p>
          </div>
          <div className="rounded-control border border-lavender-accent/50 bg-lavender-pastel p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">XP earned</p>
            <p className="mt-1 text-2xl font-bold text-indigo-950">+{xpEarned}</p>
          </div>
        </div>

        {/* Weak areas (only shown if any) */}
        {topConfusions.length > 0 && (
          <div className="w-full rounded-control border border-sunshine-accent/60 bg-sunshine-pastel/70 p-4 text-left">
            <p className="text-sm font-semibold text-indigo-950">Let&apos;s practice a bit more:</p>
            <p className="mt-1 text-base leading-relaxed text-indigo-900">
              Letters {topConfusions.join(", ")} — try listening carefully to each sound!
            </p>
          </div>
        )}

        <div className="flex w-full flex-col gap-3 sm:flex-row">
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={onPlayAgain}
            disabled={!nextLevelReady}
          >
            {nextLevelReady ? "Play Again" : "Loading next level..."}
          </Button>
          <Button variant="secondary" size="lg" className="flex-1" onClick={onGoHome}>
            Home
          </Button>
        </div>
      </Surface>
    </motion.div>
  );
}
