"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Star } from "lucide-react";

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
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center gap-6 text-center px-6 py-10 rounded-card
                 bg-white shadow-card border border-lavender-accent/20 max-w-sm mx-auto"
    >
      <h2 className="text-2xl font-bold text-indigo-900">{message.title}</h2>

      {/* Stars */}
      <div className="flex gap-3">
        {[1, 2, 3].map((n) => (
          <motion.div
            key={n}
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: n <= stars ? 1 : 0.5, rotate: 0 }}
            transition={{ delay: n * 0.15 }}
          >
            <Star
              size={44}
              className={n <= stars ? "text-sunshine-accent fill-sunshine-accent" : "text-indigo-200 fill-indigo-100"}
            />
          </motion.div>
        ))}
      </div>

      <p className="text-game text-indigo-600">{message.body}</p>

      {/* ── New badges earned this session ──────────────────────── */}
      <AnimatePresence>
        {newBadges.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-2xl bg-sunshine-pastel border-2 border-sunshine-accent/60 p-4"
          >
            <p className="text-[13px] font-bold text-amber-700 uppercase tracking-wide mb-3">
              🏅 Badge{newBadges.length > 1 ? "s" : ""} Unlocked!
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {newBadges.map((b, i) => (
                <motion.div
                  key={b.badgeId}
                  initial={{ scale: 0, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: i * 0.12, type: "spring", stiffness: 260 }}
                  className="flex flex-col items-center gap-1 bg-white rounded-xl px-4 py-3
                             border border-sunshine-accent/40 shadow-sm min-w-[80px]"
                >
                  <span className="text-4xl">{b.emoji}</span>
                  <span className="text-[12px] font-bold text-indigo-800 text-center leading-tight">{b.name}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {aiMessage && (
        <p className="text-base font-medium text-indigo-700 bg-sky-pastel p-3 rounded-xl border border-sky-accent/40 w-full text-left">
          🤖 {aiMessage}
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="rounded-xl bg-mint-pastel p-3">
          <p className="text-[11px] text-mint-accent font-semibold uppercase tracking-wide">Score</p>
          <p className="text-2xl font-bold text-indigo-900">{score}</p>
        </div>
        <div className="rounded-xl bg-lavender-pastel p-3">
          <p className="text-[11px] text-lavender-accent font-semibold uppercase tracking-wide">+XP</p>
          <p className="text-2xl font-bold text-indigo-900">{xpEarned}</p>
        </div>
      </div>

      {/* Weak areas (only shown if any) */}
      {topConfusions.length > 0 && (
        <div className="w-full rounded-xl bg-sunshine-pastel p-3 text-left">
          <p className="text-[12px] font-semibold text-indigo-700 mb-1">Let&apos;s practice a bit more:</p>
          <p className="text-base text-indigo-800">
            Letters {topConfusions.join(", ")} — try listening carefully to each sound!
          </p>
        </div>
      )}

      <div className="flex gap-3 w-full">
        <button
          onClick={() => { if (nextLevelReady) onPlayAgain(); }}
          disabled={!nextLevelReady}
          className={`flex-1 py-3 rounded-button font-semibold text-lg transition-all
            ${nextLevelReady
              ? "bg-mint-accent text-white shadow-btn-mint"
              : "bg-mint-pastel text-mint-accent border-2 border-mint-accent cursor-wait opacity-80"}`}
        >
          {nextLevelReady ? "Play Again" : "⏳ Loading next level..."}
        </button>
        <button
          onClick={onGoHome}
          className="flex-1 py-3 rounded-button bg-lavender-pastel text-indigo-800 font-semibold text-lg border border-lavender-accent"
        >
          Home
        </button>
      </div>
    </motion.div>
  );
}
