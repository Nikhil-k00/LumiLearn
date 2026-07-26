"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import type { PhonicsWord } from "@/data/phonics-content";

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
  const [queue]      = useState(() =>
    shuffle(words)
      .slice(0, 6)
      .map((w) => ({ ...w, phonemes: normalisePhonemes(w.word, w.phonemes) }))
  );
  const [index,      setIndex]    = useState(0);
  const [letters,    setLetters]  = useState<string[]>([]);  // scrambled pool
  const [assembled,  setAssembled]= useState<string[]>([]);   // child's answer
  const [feedback,   setFeedback] = useState<"idle" | "correct" | "wrong">("idle");

  const current = queue[index];

  useEffect(() => {
    if (current) {
      setLetters(shuffle([...current.phonemes]));
      setAssembled([]);
      setFeedback("idle");
      // Speak the plain word — clear and natural for children.
      // audioHint ("b-e-d") was causing hyphenated robotic spelling-out.
      setTimeout(() => speak(current.word, 0.8), 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

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
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Target picture */}
      <motion.div
        key={current.word}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center gap-2"
      >
        <div className="text-8xl">{current.emoji}</div>
        <button
          onClick={() => speak(current.word, 0.8)}
          className="flex items-center gap-2 px-4 py-2 rounded-button bg-sky-pastel border border-sky-accent text-base"
        >
          <Volume2 size={16} /> Hear it
        </button>
      </motion.div>

      {/* Assembly area */}
      <div className="flex gap-3 min-h-[72px] items-center bg-white/60 rounded-card px-6 py-3 shadow-card border border-lavender-accent/30">
        {assembled.length === 0 && (
          <p className="text-indigo-300 text-game">Tap letters to spell the word</p>
        )}
        {assembled.map((letter, i) => (
          <motion.button
            key={`${letter}-${i}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-14 h-14 rounded-xl bg-mint-pastel border-2 border-mint-accent
                       text-game-target font-bold text-indigo-900 shadow-card"
            onClick={() => removeLetter(i)}
            aria-label={`Remove ${letter}`}
          >
            {letter}
          </motion.button>
        ))}
      </div>

      {/* Letter pool */}
      <div className="flex flex-wrap gap-3 justify-center">
        {letters.map((letter, i) => (
          <motion.button
            key={`pool-${letter}-${i}`}
            whileTap={{ scale: 0.9 }}
            className="w-16 h-16 rounded-xl bg-lavender-pastel border-2 border-lavender-accent
                       text-game-target font-bold text-indigo-900 shadow-card hover:shadow-card-hover"
            onClick={() => pickLetter(letter, i)}
            aria-label={`Pick ${letter}`}
          >
            {letter}
          </motion.button>
        ))}
      </div>

      {/* Check button */}
      {assembled.length === current.phonemes.length && feedback === "idle" && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          onClick={checkAnswer}
          className="px-8 py-3 rounded-button bg-mint-accent text-white font-semibold text-lg shadow-btn-mint"
        >
          Check ✓
        </motion.button>
      )}

      {/* Feedback */}
      {feedback === "correct" && (
        <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-2xl font-bold text-mint-accent">
          🌟 Amazing!
        </motion.p>
      )}
      {feedback === "wrong" && (
        <motion.p initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-xl text-peach-accent font-semibold">
          Try again! 💪
        </motion.p>
      )}

      <p className="text-base text-indigo-400">{index + 1} / {queue.length}</p>
    </div>
  );
}
