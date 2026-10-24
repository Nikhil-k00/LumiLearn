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
  const [queue, setQueue] = useState(() => {
    const filtered = words.filter((w) => w.confusionRisk);
    const pool = filtered.length > 0 ? filtered : words;
    return pool.slice(0, 8);
  });
  const [queueReady, setQueueReady] = useState(false);
  const [index,     setIndex]    = useState(0);
  const [question,  setQuestion] = useState<ReturnType<typeof buildQuestion> | null>(null);
  const [feedback,  setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [selected,  setSelected] = useState<string | null>(null);

  const current = queue[index];

  useEffect(() => {
    const filtered = words.filter((w) => w.confusionRisk);
    const pool = filtered.length > 0 ? filtered : words;
    setQueue(shuffle(pool).slice(0, 8));
    setQueueReady(true);
  }, [words]);

  useEffect(() => {
    if (queueReady && current) {
      setQuestion(buildQuestion(current, confusionPairs));
      setFeedback("idle");
      setSelected(null);
      // Speak the plain word clearly at a comfortable pace
      setTimeout(() => speak(current.word, 0.8), 300);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, queueReady]);

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
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 sm:gap-8" aria-label="Missing Letter">
      {/* Word with blank */}
      <motion.div
        key={current.word}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full flex-col items-center"
      >
        <div className="flex w-full max-w-xl flex-col items-center gap-4 rounded-panel border border-sky-accent/40 bg-sky-pastel/60 p-5 text-center sm:p-7">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-indigo-800">Find the missing letter</p>
          <span className="text-6xl leading-none sm:text-7xl" aria-hidden="true">{current.emoji}</span>
          <div className="flex max-w-full items-center gap-3 rounded-control bg-white/90 px-4 py-2">
            <span aria-label={`Word pattern: ${question.display.split("").join(" ")}`} className="break-all text-4xl font-bold tracking-[0.08em] text-indigo-950 sm:text-5xl">
              {question.display.toUpperCase()}
            </span>
            <button
              type="button"
              onClick={() => speak(current.word, 0.8)}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-sky-accent bg-sky-pastel text-indigo-800 transition-colors hover:bg-sky-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
              aria-label="Hear the whole word"
            >
              <Volume2 size={20} aria-hidden="true" />
            </button>
          </div>
          <h2 className="text-xl font-bold leading-relaxed text-indigo-950 sm:text-2xl">Which letter fills the blank?</h2>
        </div>
      </motion.div>

      {/* Two large option buttons */}
      <div className="grid w-full max-w-md grid-cols-2 gap-4 sm:gap-6" role="group" aria-label="Choose the missing letter">
        {question.options.map((letter, index) => {
          const pair = confusionPairs.find((p) => p.letter1 === letter || p.letter2 === letter);
          const hint = pair?.letter1 === letter ? pair.hint1 : pair?.hint2 ?? "";
          return (
            <motion.button
              key={`${letter}-${index}`}
              type="button"
              disabled={feedback !== "idle"}
              whileTap={feedback === "idle" ? { scale: 0.97 } : undefined}
              animate={feedback === "wrong" && selected === letter ? { x: [0,-4,4,-4,4,0] } : {}}
              onClick={() => handlePick(letter)}
              aria-label={`${letter.toUpperCase()}${hint ? `, ${hint}` : ""}`}
              aria-pressed={selected === letter}
              className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-panel border-2 px-3 py-4 shadow-panel transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-default sm:min-h-32
                ${selected === letter && feedback === "correct" ? "border-mint-accent bg-mint-pastel" :
                  selected === letter && feedback === "wrong"   ? "border-peach-accent bg-peach-pastel" :
                  "border-lavender-accent bg-lavender-pastel hover:bg-lavender-accent/40"}`}
            >
              <span className="text-5xl font-bold leading-none text-indigo-950" aria-hidden="true">{letter.toUpperCase()}</span>
              {hint && <span className="text-sm font-medium leading-tight text-indigo-900">{hint}</span>}
            </motion.button>
          );
        })}
      </div>

      {feedback !== "idle" && (
        <p className={`rounded-control border px-5 py-3 text-lg font-semibold ${feedback === "correct" ? "border-mint-accent/50 bg-mint-pastel text-success" : "border-peach-accent/60 bg-peach-pastel text-error-text"}`} role="status" aria-live="polite">
          {feedback === "correct" ? "Yes! That's the right letter." : "Good try! Listen and look carefully."}
        </p>
      )}

      <div className="w-full max-w-xl">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-indigo-900">
          <span>Question {index + 1} of {queue.length}</span>
          <span>{Math.round(((index + 1) / queue.length) * 100)}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-surface-soft" role="progressbar" aria-label="Missing Letter progress" aria-valuemin={0} aria-valuemax={queue.length} aria-valuenow={index + 1}>
          <div className="h-full rounded-full bg-lavender-accent transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${((index + 1) / queue.length) * 100}%` }} />
        </div>
      </div>
    </section>
  );
}
