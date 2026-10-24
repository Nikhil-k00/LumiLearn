"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import type { RhymePair } from "@/data/memory-content";

interface RhymeMatcherProps {
  pairs: RhymePair[];
  onResult: (isCorrect: boolean) => void;
  onRoundComplete: () => void;
}

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

const DEFAULT_RHYME_PAIRS: RhymePair[] = [
  { word1: "cat",   word2: "hat",   emoji1: "🐱", emoji2: "🎩", rhymes: true  },
  { word1: "dog",   word2: "log",   emoji1: "🐶", emoji2: "🪵", rhymes: true  },
  { word1: "sun",   word2: "run",   emoji1: "☀️", emoji2: "🏃", rhymes: true  },
  { word1: "bed",   word2: "red",   emoji1: "🛏️", emoji2: "🔴", rhymes: true  },
  { word1: "big",   word2: "pig",   emoji1: "🐘", emoji2: "🐷", rhymes: true  },
  { word1: "cat",   word2: "dog",   emoji1: "🐱", emoji2: "🐶", rhymes: false },
  { word1: "sun",   word2: "bed",   emoji1: "☀️", emoji2: "🛏️", rhymes: false },
];

export function RhymeMatcher({ pairs, onResult, onRoundComplete }: RhymeMatcherProps) {
  const { speak }  = useTTS();
  const [queue, setQueue] = useState(() => {
    const activePool = pairs && pairs.length > 0 ? pairs : DEFAULT_RHYME_PAIRS;
    return activePool.slice(0, 8);
  });
  const [queueReady, setQueueReady] = useState(false);
  const [index,    setIndex]   = useState(0);
  const [feedback, setFeedback]= useState<"idle" | "correct" | "wrong">("idle");

  const current = queue[index];

  useEffect(() => {
    const activePool = pairs && pairs.length > 0 ? pairs : DEFAULT_RHYME_PAIRS;
    setQueue(shuffle(activePool).slice(0, 8));
    setQueueReady(true);
  }, [pairs]);

  useEffect(() => {
    if (queueReady && current) {
      // Auto-play both words
      setTimeout(() => speak(current.word1, 0.8), 400);
      setTimeout(() => speak(current.word2, 0.8), 1000);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, queueReady]);

  const handleAnswer = (userSaysRhymes: boolean) => {
    if (feedback !== "idle") return;
    const isOk = userSaysRhymes === current.rhymes;
    onResult(isOk);
    setFeedback(isOk ? "correct" : "wrong");
    speak(isOk ? "That's right!" : `${current.word1} and ${current.word2} ${current.rhymes ? "do" : "do not"} rhyme.`);
    setTimeout(() => {
      setFeedback("idle");
      if (index + 1 >= queue.length) onRoundComplete();
      else setIndex((i) => i + 1);
    }, 1300);
  };

  if (!current) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      <p className="text-game text-indigo-700 font-semibold text-center">Do these words rhyme?</p>

      {/* Two word cards */}
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
        {[{ word: current.word1, emoji: current.emoji1 }, { word: current.word2, emoji: current.emoji2 }].map(({ word, emoji }) => (
          <motion.div key={word}
            className="flex w-40 flex-col items-center gap-3 bg-white rounded-card p-6 shadow-card border border-lavender-accent/30">
            <span className="text-7xl">{emoji}</span>
            <span className="text-3xl font-bold text-indigo-900">{word}</span>
            <button onClick={() => speak(word, 0.8)}
              className="p-2 rounded-full bg-sky-pastel border border-sky-accent mt-2">
              <Volume2 size={20} className="text-sky-700" />
            </button>
          </motion.div>
        ))}
      </div>

      {/* Play both */}
      <button onClick={() => { speak(current.word1, 0.8); setTimeout(() => speak(current.word2, 0.8), 800); }}
        className="flex items-center gap-2 px-4 py-2 rounded-button bg-sunshine-pastel border border-sunshine-accent text-indigo-800 text-base">
        <Volume2 size={16} /> Hear both
      </button>

      {/* YES / NO */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 sm:gap-6">
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => handleAnswer(true)}
          className="w-40 py-6 rounded-card bg-mint-pastel border-2 border-mint-accent text-3xl font-bold text-indigo-900 shadow-card">
          ✅ Yes
        </motion.button>
        <motion.button whileTap={{ scale: 0.92 }} onClick={() => handleAnswer(false)}
          className="w-40 py-6 rounded-card bg-peach-pastel border-2 border-peach-accent text-3xl font-bold text-indigo-900 shadow-card">
          ❌ No
        </motion.button>
      </div>

      {feedback === "correct" && <p className="text-2xl font-bold text-mint-accent">🌟 Correct!</p>}
      {feedback === "wrong"   && <p className="text-xl text-peach-accent font-semibold">💪 Keep trying!</p>}

      <p className="text-base text-indigo-400">{index + 1} / {queue.length}</p>
    </div>
  );
}
