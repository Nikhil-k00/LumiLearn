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
  const [selected, setSelected] = useState<boolean | null>(null);

  const current = queue[index];

  useEffect(() => {
    const activePool = pairs && pairs.length > 0 ? pairs : DEFAULT_RHYME_PAIRS;
    setQueue(shuffle(activePool).slice(0, 8));
    setQueueReady(true);
  }, [pairs]);

  useEffect(() => {
    if (queueReady && current) {
      setSelected(null);
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
    setSelected(userSaysRhymes);
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
    <section className="flex w-full flex-col items-center gap-5 sm:gap-6" aria-labelledby="rhyme-matcher-title">
      <div className="text-center">
        <h2 id="rhyme-matcher-title" className="text-xl font-bold tracking-tight text-indigo-950 sm:text-2xl">
          Do these words rhyme?
        </h2>
        <p className="mt-1 text-base leading-relaxed text-muted">Listen to both words, then choose Yes or No.</p>
      </div>

      <div className="grid w-full max-w-xl grid-cols-2 gap-3 sm:gap-5">
        {[{ word: current.word1, emoji: current.emoji1 }, { word: current.word2, emoji: current.emoji2 }].map(({ word, emoji }) => (
          <motion.div
            key={word}
            className="flex min-w-0 flex-col items-center gap-3 rounded-panel border border-border-subtle bg-surface p-4 shadow-panel sm:p-6"
          >
            <span className="text-5xl sm:text-7xl" aria-hidden="true">{emoji}</span>
            <span className="break-words text-2xl font-bold tracking-wide text-indigo-950 sm:text-3xl">{word}</span>
            <button
              type="button"
              onClick={() => speak(word, 0.8)}
              aria-label={`Hear ${word}`}
              className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-full border border-sky-accent bg-sky-pastel text-sky-800 transition-colors hover:bg-sky-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            >
              <Volume2 size={19} aria-hidden="true" />
            </button>
          </motion.div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => { speak(current.word1, 0.8); setTimeout(() => speak(current.word2, 0.8), 800); }}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-sunshine-accent/70 bg-sunshine-pastel px-5 py-3 text-base font-semibold text-indigo-950 transition-colors hover:bg-sunshine-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
      >
        <Volume2 size={17} aria-hidden="true" /> Hear both words
      </button>

      <div className="grid w-full max-w-md grid-cols-2 gap-3 sm:gap-4">
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => handleAnswer(true)}
          disabled={feedback !== "idle"}
          aria-pressed={selected === true}
          className={`min-h-16 rounded-panel border-2 px-4 py-4 text-xl font-bold text-indigo-950 shadow-panel transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-default sm:text-2xl ${
            selected === true ? feedback === "correct" ? "border-emerald-800 bg-mint-pastel" : "border-orange-800 bg-peach-pastel" : "border-mint-accent bg-mint-pastel hover:bg-mint-accent/30"
          }`}
        >
          <span aria-hidden="true">{selected === true ? feedback === "correct" ? "✓ " : "× " : ""}</span>Yes
        </motion.button>
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => handleAnswer(false)}
          disabled={feedback !== "idle"}
          aria-pressed={selected === false}
          className={`min-h-16 rounded-panel border-2 px-4 py-4 text-xl font-bold text-indigo-950 shadow-panel transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-default sm:text-2xl ${
            selected === false ? feedback === "correct" ? "border-emerald-800 bg-mint-pastel" : "border-orange-800 bg-peach-pastel" : "border-peach-accent bg-peach-pastel hover:bg-peach-accent/30"
          }`}
        >
          <span aria-hidden="true">{selected === false ? feedback === "correct" ? "✓ " : "× " : ""}</span>No
        </motion.button>
      </div>

      {feedback !== "idle" && (
        <p className="text-base font-semibold text-indigo-950" role="status" aria-live="polite">
          {feedback === "correct" ? "✓ That’s right!" : "↻ Keep trying! Listen to the words."}
        </p>
      )}

      <p className="text-sm font-semibold tabular-nums text-muted" aria-label={`Pair ${index + 1} of ${queue.length}`}>
        {index + 1} of {queue.length}
      </p>
    </section>
  );
}
