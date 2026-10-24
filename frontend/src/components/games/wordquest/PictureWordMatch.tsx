"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import type { WordPicturePair } from "@/data/word-quest-content";

interface PictureWordMatchProps {
  pairs: WordPicturePair[];
  onAnswer: (isCorrect: boolean) => boolean;
  onRoundComplete: () => void;
  onTTSUse: () => void;
}

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

export function PictureWordMatch({ pairs, onAnswer, onRoundComplete, onTTSUse }: PictureWordMatchProps) {
  const { speak }   = useTTS();
  const [queue, setQueue] = useState(() => pairs.slice(0, 8));
  const [queueReady, setQueueReady] = useState(false);
  const [index,     setIndex]   = useState(0);
  const [options,   setOptions] = useState<WordPicturePair[]>([]);
  const [feedback,  setFeedback]= useState<"idle" | "correct" | "wrong">("idle");
  const [selected,  setSelected]= useState<string | null>(null);

  const current = queue[index];

  useEffect(() => {
    setQueue(shuffle(pairs).slice(0, 8));
    setQueueReady(true);
  }, [pairs]);

  useEffect(() => {
    if (queueReady && current) {
      const others = shuffle(pairs.filter((p) => p.word !== current.word)).slice(0, 3);
      setOptions(shuffle([current, ...others]));
    }
  }, [index, current, pairs, queueReady]);

  const handlePick = (word: string) => {
    if (feedback !== "idle") return;
    const isOk = onAnswer(word === current.word);
    setSelected(word);
    setFeedback(isOk ? "correct" : "wrong");
    speak(isOk ? `Yes! ${current.word}!` : `This is ${current.word}. Try again!`);
    setTimeout(() => {
      setFeedback("idle"); setSelected(null);
      if (index + 1 >= queue.length) onRoundComplete();
      else setIndex((i) => i + 1);
    }, 1200);
  };

  if (!current) return null;

  return (
    <section className="flex w-full flex-col items-center gap-6" aria-labelledby="picture-match-prompt">
      <motion.div
        key={current.word}
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        className="flex min-h-40 min-w-40 items-center justify-center rounded-panel border border-sunshine-accent/60 bg-sunshine-pastel p-6 text-7xl shadow-panel sm:min-h-48 sm:min-w-48 sm:text-8xl"
        role="img"
        aria-label="Picture clue"
      >
        {current.emoji}
      </motion.div>
      <div className="text-center">
        <h2 id="picture-match-prompt" className="text-xl font-bold tracking-tight text-indigo-950 sm:text-2xl">
          Which word matches this picture?
        </h2>
        <p className="mt-1 text-base leading-relaxed text-muted">Choose the word that names the picture.</p>
      </div>

      <div className="grid w-full max-w-3xl grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
        {options.map((opt) => (
          <motion.div key={opt.word} whileTap={{ scale: 0.98 }} className="relative">
            <button
              type="button"
              onClick={() => handlePick(opt.word)}
              disabled={feedback !== "idle"}
              aria-pressed={selected === opt.word}
              className={`w-full min-h-20 rounded-panel border-2 px-12 py-5 text-2xl font-bold tracking-wide transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 sm:text-3xl
                ${selected === opt.word && feedback === "correct" ? "bg-mint-pastel border-mint-accent" :
                  selected === opt.word && feedback === "wrong"   ? "bg-peach-pastel border-peach-accent" :
                  "bg-surface border-border-strong shadow-panel hover:bg-lavender-pastel"}`}
            >
              {opt.word}
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); speak(opt.word); onTTSUse(); }}
              className="absolute right-2 top-1/2 inline-flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-sky-accent bg-sky-pastel text-sky-800 transition-colors hover:bg-sky-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              aria-label={`Hear ${opt.word}`}
            >
              <Volume2 size={19} aria-hidden="true" />
            </button>
          </motion.div>
        ))}
      </div>
      {feedback !== "idle" && (
        <p className="text-base font-semibold text-indigo-950" role="status" aria-live="polite">
          {feedback === "correct" ? "That’s right! Great matching." : "Not quite. Keep going!"}
        </p>
      )}
      <p className="text-sm font-semibold tabular-nums text-muted" aria-label={`Question ${index + 1} of ${queue.length}`}>
        {index + 1} of {queue.length}
      </p>
    </section>
  );
}
