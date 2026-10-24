"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import type { PhonicsWord } from "@/data/phonics-content";
import { Button } from "@/components/ui/Button";

interface BuildAWordGameProps {
  words: PhonicsWord[];
  onAnswer: (item: string, studentAnswer: string, correct: string) => boolean;
  onRoundComplete: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/**
 * Normalise the phonemes array coming from AI-generated content.
 *
 * GPT sometimes returns the whole word as a single element:
 *   "thunder" → ["thunder"]  (1 tile — wrong, shows whole word in one box)
 * or merges chunks:
 *   "thunder" → ["TH","under"] (uppercase + merged coda)
 *
 * Rules applied:
 *  1. Lowercase every element.
 *  2. If there is exactly 1 element AND it matches the full word → split into
 *     individual letters so children still get letter tiles to tap.
 *  3. Any element that equals the entire word (case-insensitive) → split to letters.
 */
function normalisePhonemes(word: string, phonemes: string[]): string[] {
  const lower = phonemes.map((p) => p.toLowerCase());
  // If GPT collapsed everything into one tile, split to individual letters
  return lower.flatMap((p) =>
    p === word.toLowerCase() ? word.toLowerCase().split("") : [p]
  );
}

export function BuildAWordGame({ words, onAnswer, onRoundComplete }: BuildAWordGameProps) {
  const { speak }    = useTTS();
  const [queue, setQueue] = useState(() =>
    words
      .slice(0, 6)
      .map((w) => ({ ...w, phonemes: normalisePhonemes(w.word, w.phonemes) }))
  );
  const [queueReady, setQueueReady] = useState(false);
  const [index,      setIndex]    = useState(0);
  const [letters,    setLetters]  = useState<string[]>([]);  // scrambled pool
  const [assembled,  setAssembled]= useState<string[]>([]);   // child's answer
  const [feedback,   setFeedback] = useState<"idle" | "correct" | "wrong">("idle");

  const current = queue[index];

  useEffect(() => {
    setQueue(shuffle(words)
      .slice(0, 6)
      .map((w) => ({ ...w, phonemes: normalisePhonemes(w.word, w.phonemes) })));
    setQueueReady(true);
  }, [words]);

  useEffect(() => {
    if (queueReady && current) {
      setLetters(shuffle([...current.phonemes]));
      setAssembled([]);
      setFeedback("idle");
      // Speak the plain word — clear and natural for children.
      // audioHint ("b-e-d") was causing hyphenated robotic spelling-out.
      setTimeout(() => speak(current.word, 0.8), 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, queueReady]);

  const pickLetter = (letter: string, fromIndex: number) => {
    if (feedback !== "idle") return;
    setLetters((prev) => prev.filter((_, i) => i !== fromIndex));
    setAssembled((prev) => [...prev, letter]);
  };

  const removeLetter = (fromIndex: number) => {
    if (feedback !== "idle") return;
    const letter = assembled[fromIndex];
    setAssembled((prev) => prev.filter((_, i) => i !== fromIndex));
    setLetters((prev) => [...prev, letter]);
  };

  const checkAnswer = () => {
    // Primary check: assembled tiles match the normalised phoneme order (case-insensitive).
    // Fallback check: joined tiles spell the word — catches AI phonemes that don't
    // concatenate exactly to the spelling (e.g. "qu"+"i"+"ck" = "quick" ✓).
    const tilesMatch =
      assembled.length === current.phonemes.length &&
      assembled.every((tile, i) => tile.toLowerCase() === current.phonemes[i].toLowerCase());
    const studentWord   = assembled.join("").toLowerCase();
    const assembledCorrect = tilesMatch || studentWord === current.word.toLowerCase();
    const isOk = assembledCorrect
      ? onAnswer(current.word, current.word, current.word)   // correct
      : onAnswer(current.word, studentWord, current.word);   // wrong — pass actual attempt
    setFeedback(isOk ? "correct" : "wrong");
    speak(isOk ? `Amazing! ${current.word}!` : `Try again! ${current.word}`);

    setTimeout(() => {
      if (isOk) {
        if (index + 1 >= queue.length) {
          onRoundComplete();
        } else {
          setIndex((i) => i + 1);
        }
      } else {
        // Reset for retry
        setLetters(shuffle([...current.phonemes]));
        setAssembled([]);
        setFeedback("idle");
      }
    }, 1400);
  };

  if (!current) return null;

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-5 sm:gap-6" aria-label="Build a Word">
      {/* Target picture */}
      <motion.div
        key={current.word}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full flex-col items-center"
      >
        <div className="flex w-full max-w-xl flex-col items-center gap-3 rounded-panel border border-sky-accent/40 bg-sky-pastel/60 p-5 text-center sm:p-6">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-800">Build the word</p>
          <span className="text-7xl leading-none sm:text-8xl" aria-hidden="true">{current.emoji}</span>
          <p className="text-lg font-semibold text-indigo-950">Tap the letters in order to spell it.</p>
          <button
            type="button"
            onClick={() => speak(current.word, 0.8)}
            className="inline-flex min-h-11 items-center gap-2 rounded-control border border-sky-accent bg-white px-4 py-2 text-sm font-semibold text-indigo-900 transition-colors hover:bg-sky-pastel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
            aria-label="Hear the word"
          >
            <Volume2 size={18} aria-hidden="true" /> Hear the word
          </button>
        </div>
      </motion.div>

      {/* Assembly area */}
      <div
        className="flex min-h-20 w-full max-w-2xl flex-wrap items-center justify-center gap-2 rounded-panel border border-lavender-accent/40 bg-white p-3 shadow-panel sm:gap-3 sm:p-4"
        role="group"
        aria-label="Your word, tap a letter to remove it"
        aria-live="polite"
      >
        {assembled.length === 0 && (
          <p className="px-2 text-center text-base font-medium text-muted">Your letters will appear here</p>
        )}
        {assembled.map((letter, i) => (
          <motion.button
            key={`${letter}-${i}`}
            type="button"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            disabled={feedback !== "idle"}
            className="inline-flex h-12 min-w-12 items-center justify-center rounded-control border-2 border-mint-accent bg-mint-pastel px-3 text-2xl font-bold text-indigo-950 shadow-panel transition-colors hover:bg-mint-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-default sm:h-14 sm:min-w-14 sm:text-3xl"
            onClick={() => removeLetter(i)}
            aria-label={`Remove letter ${letter}`}
          >
            {letter}
          </motion.button>
        ))}
      </div>

      {/* Letter pool */}
      <div className="flex w-full max-w-2xl flex-wrap justify-center gap-2 sm:gap-3" role="group" aria-label="Available letters">
        {letters.map((letter, i) => (
          <motion.button
            key={`pool-${letter}-${i}`}
            type="button"
            whileTap={feedback === "idle" ? { scale: 0.96 } : undefined}
            disabled={feedback !== "idle"}
            className="inline-flex h-14 min-w-14 items-center justify-center rounded-control border-2 border-lavender-accent bg-lavender-pastel px-3 text-2xl font-bold text-indigo-950 shadow-panel transition-colors hover:bg-lavender-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-default sm:h-16 sm:min-w-16 sm:text-3xl"
            onClick={() => pickLetter(letter, i)}
            aria-label={`Pick ${letter}`}
          >
            {letter}
          </motion.button>
        ))}
      </div>

      {/* Check button */}
      {assembled.length === current.phonemes.length && feedback === "idle" && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
          <Button size="lg" onClick={checkAnswer}>Check answer <span aria-hidden="true">✓</span></Button>
        </motion.div>
      )}

      {/* Feedback */}
      {feedback === "correct" && (
        <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-control border border-mint-accent/50 bg-mint-pastel px-5 py-3 text-lg font-bold text-success" role="status" aria-live="polite">
          🌟 Amazing!
        </motion.p>
      )}
      {feedback === "wrong" && (
        <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="rounded-control border border-peach-accent/60 bg-peach-pastel px-5 py-3 text-lg font-semibold text-error-text" role="status" aria-live="polite">
          Try again! 💪
        </motion.p>
      )}

      <div className="w-full max-w-xl">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-indigo-900">
          <span>Question {index + 1} of {queue.length}</span>
          <span>{Math.round(((index + 1) / queue.length) * 100)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-soft" role="progressbar" aria-label="Build a Word progress" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={index + 1}>
          <div className="h-full rounded-full bg-mint-accent transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((index + 1) / queue.length) * 100}%` }} />
        </div>
      </div>
    </section>
  );
}
