"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import type { PhonicsWord } from "@/data/phonics-content";
import type { ConfusionPair } from "@/data/phonics-content";

interface MissingLetterGameProps {
  words: PhonicsWord[];
  confusionPairs: ConfusionPair[];
  onAnswer: (item: string, studentAnswer: string, correct: string) => boolean;
  onRoundComplete: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

/** Build a question: blank one letter from a confusion-risk word */
function buildQuestion(word: PhonicsWord, pairs: ConfusionPair[]) {
  // Prefer blanking a confusion-risk letter if possible
  const confusedLetters = pairs.flatMap((p) => [p.letter1, p.letter2]);
  const wordLetters = word.word.split("");

  let blankIndex = wordLetters.findIndex((l) => confusedLetters.includes(l));
  if (blankIndex === -1) blankIndex = 0;  // fallback to first letter

  const correctLetter = wordLetters[blankIndex];

  // Find the confusion partner (distractor)
  const pair = pairs.find((p) => p.letter1 === correctLetter || p.letter2 === correctLetter);
  const distractor = pair
    ? pair.letter1 === correctLetter ? pair.letter2 : pair.letter1
    : String.fromCharCode(correctLetter.charCodeAt(0) + 1); // simple fallback

  const options = shuffle([correctLetter, distractor]);
  const display = wordLetters.map((l, i) => (i === blankIndex ? "_" : l)).join("");

  return { display, correctLetter, options, blankIndex };
}

export function MissingLetterGame({ words, confusionPairs, onAnswer, onRoundComplete }: MissingLetterGameProps) {
  const { speak }   = useTTS();
  const [queue]     = useState(() => {
    const filtered = words.filter((w) => w.confusionRisk);
    const pool = filtered.length > 0 ? filtered : words;
    return shuffle(pool).slice(0, 8);
  });
  const [index,     setIndex]    = useState(0);
  const [question,  setQuestion] = useState<ReturnType<typeof buildQuestion> | null>(null);
  const [feedback,  setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [selected,  setSelected] = useState<string | null>(null);

  const current = queue[index];

  useEffect(() => {
    if (current) {
      setQuestion(buildQuestion(current, confusionPairs));
      setFeedback("idle");
      setSelected(null);
      // Speak the plain word clearly at a comfortable pace
      setTimeout(() => speak(current.word, 0.8), 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  const handlePick = (letter: string) => {
    if (feedback !== "idle" || !question) return;
    const isOk = onAnswer(current.word, letter, question.correctLetter);
    setSelected(letter);
    setFeedback(isOk ? "correct" : "wrong");
    speak(isOk ? `Yes! The letter is ${question.correctLetter}` : `It's ${question.correctLetter} in ${current.word}`);

    setTimeout(() => {
      setFeedback("idle");
      setSelected(null);
      if (index + 1 >= queue.length) {
        onRoundComplete();
      } else {
        setIndex((i) => i + 1);
      }
    }, 1300);
  };

  if (!current || !question) return null;

  return (
    <div className="flex flex-col items-center gap-8 w-full">
      {/* Word with blank */}
      <motion.div
        key={current.word}
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4"
      >
        <div className="text-7xl">{current.emoji}</div>
        <div className="flex items-center gap-2">
          <span className="text-[42px] font-bold tracking-[0.12em] text-indigo-900 font-lexend">
            {question.display.toUpperCase()}
          </span>
          <button
            onClick={() => speak(current.word, 0.8)}
            className="ml-2 p-2 rounded-full bg-sky-pastel border border-sky-accent"
            aria-label="Hear the word"
          >
            <Volume2 size={20} className="text-sky-700" />
          </button>
        </div>
        <p className="text-game text-indigo-600">Which letter fills the blank?</p>
      </motion.div>

      {/* Two large option buttons */}
      <div className="flex gap-6">
        {question.options.map((letter) => {
          const pair = confusionPairs.find((p) => p.letter1 === letter || p.letter2 === letter);
          const hint = pair?.letter1 === letter ? pair.hint1 : pair?.hint2 ?? "";
          return (
            <motion.button
              key={letter}
              whileTap={{ scale: 0.92 }}
              animate={feedback === "wrong" && selected === letter ? { x: [0,-5,5,-5,5,0] } : {}}
              onClick={() => handlePick(letter)}
              className={`w-28 h-28 rounded-card flex flex-col items-center justify-center gap-1 border-2 shadow-card font-bold transition-all
                ${selected === letter && feedback === "correct" ? "bg-mint-pastel border-mint-accent" :
                  selected === letter && feedback === "wrong"   ? "bg-peach-pastel border-peach-accent" :
                  "bg-lavender-pastel border-lavender-accent hover:shadow-card-hover"}`}
            >
              <span className="text-[48px] leading-none">{letter.toUpperCase()}</span>
              <span className="text-[10px] text-indigo-500 text-center px-1 leading-tight">{hint}</span>
            </motion.button>
          );
        })}
      </div>

      <p className="text-base text-indigo-400">{index + 1} / {queue.length}</p>
    </div>
  );
}
