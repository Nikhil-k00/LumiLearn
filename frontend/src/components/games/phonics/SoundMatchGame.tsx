"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import { LetterCard } from "./LetterCard";
import type { PhonicsWord } from "@/data/phonics-content";

interface SoundMatchGameProps {
  words: PhonicsWord[];
  onAnswer: (item: string, studentAnswer: string, correct: string) => boolean;
  onRoundComplete: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function buildOptions(correct: PhonicsWord, pool: PhonicsWord[]): PhonicsWord[] {
  const others = shuffle(pool.filter((w) => w.word !== correct.word)).slice(0, 3);
  return shuffle([correct, ...others]);
}

export function SoundMatchGame({ words, onAnswer, onRoundComplete }: SoundMatchGameProps) {
  const { speak } = useTTS();
  const [queue,     setQueue]     = useState<PhonicsWord[]>(() => words.slice(0, 8));
  const [queueReady, setQueueReady] = useState(false);
  const [index,     setIndex]     = useState(0);
  const [options,   setOptions]   = useState<PhonicsWord[]>([]);
  const [feedback,  setFeedback]  = useState<"idle" | "correct" | "wrong">("idle");
  const [selected,  setSelected]  = useState<string | null>(null);
  const [streak,    setStreak]    = useState(0);

  const current = queue[index];

  useEffect(() => {
    setQueue(shuffle(words).slice(0, 8));
    setQueueReady(true);
  }, [words]);

  useEffect(() => {
    if (queueReady && current) {
      setOptions(buildOptions(current, words));
      // Speak the plain word — clear natural pronunciation.
      // audioHint ("c-a-t") was causing robotic letter-spelling.
      setTimeout(() => speak(current.word, 0.8), 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current, queueReady]);

  const handleSelect = (word: PhonicsWord) => {
    if (feedback !== "idle") return;
    const correct = current.word;
    const isOk = onAnswer(current.word, word.word, correct);
    setSelected(word.word);
    setFeedback(isOk ? "correct" : "wrong");

    if (isOk) {
      setStreak((s) => s + 1);
      speak(`Yes! ${current.word}`);
    } else {
      setStreak(0);
      speak(`It's ${current.word}`);
    }

    setTimeout(() => {
      setFeedback("idle");
      setSelected(null);
      if (index + 1 >= queue.length) {
        onRoundComplete();
      } else {
        setIndex((i) => i + 1);
      }
    }, 1200);
  };

  if (!current) return null;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 sm:gap-8" aria-label="Sound Match">
      {/* Target — play audio, show emoji */}
      <motion.div
        key={current.word}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full flex-col items-center gap-4"
      >
        <div className="flex w-full max-w-xl flex-col items-center gap-4 rounded-panel border border-sunshine-accent/40 bg-sunshine-pastel/60 p-5 text-center sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-800">Listen, then choose the first letter</p>
          <button
            type="button"
            onClick={() => speak(current.audioHint, 0.75)}
            className="flex h-28 w-28 items-center justify-center rounded-panel border-2 border-sunshine-accent bg-white text-6xl shadow-panel transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 sm:h-32 sm:w-32"
            aria-label={`Hear the sound: ${current.audioHint}`}
          >
            <span aria-hidden="true">{current.emoji}</span>
          </button>
          <h2 className="text-xl font-bold leading-relaxed text-indigo-950 sm:text-2xl">Which letter does this start with?</h2>
          <button
            type="button"
            onClick={() => speak(current.word, 0.8)}
            className="inline-flex min-h-11 items-center gap-2 rounded-control border border-sky-accent bg-sky-pastel px-4 py-2 text-sm font-semibold text-indigo-900 transition-colors hover:bg-sky-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            <Volume2 size={18} aria-hidden="true" /> Hear the word again
          </button>
        </div>
      </motion.div>

      {/* Streak indicator */}
      {streak >= 2 && (
        <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="text-lg font-semibold text-amber-900" aria-live="polite">
          {"🔥".repeat(Math.min(streak, 5))} {streak} in a row!
        </motion.p>
      )}

      {/* Options */}
      <div className="grid w-full max-w-xl grid-cols-2 gap-3 sm:gap-4" role="group" aria-label="Choose the starting letter">
        {options.map((opt) => (
          <LetterCard
            key={opt.word}
            letter={opt.word[0].toUpperCase()}
            emoji={opt.emoji}
            hint={opt.word}
            variant={
              selected === null    ? "default"
              : opt.word === current.word ? "correct"
              : selected === opt.word  ? "wrong"
              : "default"
            }
            disabled={feedback !== "idle"}
            selected={selected === opt.word}
            onClick={() => handleSelect(opt)}
          />
        ))}
      </div>

      {feedback !== "idle" && (
        <p className={`rounded-control border px-5 py-3 text-lg font-semibold ${feedback === "correct" ? "border-mint-accent/50 bg-mint-pastel text-success" : "border-peach-accent/60 bg-peach-pastel text-error-text"}`} role="status" aria-live="polite">
          {feedback === "correct" ? `Yes! ${current.word} starts with ${current.word[0].toUpperCase()}.` : `Good try! ${current.word} starts with ${current.word[0].toUpperCase()}.`}
        </p>
      )}

      {/* Progress */}
      <div className="w-full max-w-xl">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-indigo-900">
          <span>Question {index + 1} of {queue.length}</span>
          <span>{Math.round(((index + 1) / queue.length) * 100)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-soft" role="progressbar" aria-label="Sound Match progress" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={index + 1}>
          <div className="h-full rounded-full bg-sky-accent transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((index + 1) / queue.length) * 100}%` }} />
        </div>
      </div>
    </section>
  );
}
