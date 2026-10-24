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
    <div className="flex flex-col items-center gap-8 w-full">
      {/* Target — play audio, show emoji */}
      <motion.div
        key={current.word}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3"
      >
        <button
          onClick={() => speak(current.audioHint, 0.75)}
          className="w-32 h-32 rounded-card bg-sunshine-pastel border-2 border-sunshine-accent
                     flex flex-col items-center justify-center shadow-card hover:shadow-card-hover
                     transition-all text-6xl"
          aria-label={`Hear the sound: ${current.audioHint}`}
        >
          {current.emoji}
        </button>
        <p className="text-game text-indigo-700 font-semibold">Which letter does this start with?</p>
        <button
          onClick={() => speak(current.word, 0.8)}
          className="flex items-center gap-2 px-4 py-2 rounded-button bg-sky-pastel text-sky-700
                     border border-sky-accent text-base font-medium"
        >
          <Volume2 size={18} /> Hear it again
        </button>
      </motion.div>

      {/* Streak indicator */}
      {streak >= 2 && (
        <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl">
          {"🔥".repeat(Math.min(streak, 5))} {streak} in a row!
        </motion.p>
      )}

      {/* Options */}
      <div className="grid grid-cols-2 gap-4">
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
            onClick={() => handleSelect(opt)}
          />
        ))}
      </div>

      {/* Progress */}
      <p className="text-base text-indigo-400">{index + 1} / {queue.length}</p>
    </div>
  );
}
