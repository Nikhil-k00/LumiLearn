"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import type { BeginningSound } from "@/data/memory-content";

interface BeginningStartProps {
  sounds: BeginningSound[];
  onResult: (isCorrect: boolean) => void;
  onRoundComplete: () => void;
}

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

// Robust fallback pool — always available even when dynamic level data is sparse
const DEFAULT_BEGINNING_SOUNDS: BeginningSound[] = [
  {
    phoneme: "/b/",
    ttsText: "b, as in ball",
    options: [
      { word: "ball",  emoji: "⚽", isCorrect: true  },
      { word: "cat",   emoji: "🐱", isCorrect: false },
      { word: "dog",   emoji: "🐶", isCorrect: false },
    ],
  },
  {
    phoneme: "/s/",
    ttsText: "s, as in sun",
    options: [
      { word: "sun",   emoji: "☀️", isCorrect: true  },
      { word: "hat",   emoji: "🎩", isCorrect: false },
      { word: "pig",   emoji: "🐷", isCorrect: false },
    ],
  },
  {
    phoneme: "/d/",
    ttsText: "d, as in duck",
    options: [
      { word: "duck",  emoji: "🦆", isCorrect: true  },
      { word: "ball",  emoji: "⚽", isCorrect: false },
      { word: "sun",   emoji: "☀️", isCorrect: false },
    ],
  },
  {
    phoneme: "/m/",
    ttsText: "m, as in moon",
    options: [
      { word: "moon",  emoji: "🌙", isCorrect: true  },
      { word: "duck",  emoji: "🦆", isCorrect: false },
      { word: "cat",   emoji: "🐱", isCorrect: false },
    ],
  },
  {
    phoneme: "/h/",
    ttsText: "h, as in hat",
    options: [
      { word: "hat",   emoji: "🎩", isCorrect: true  },
      { word: "dog",   emoji: "🐶", isCorrect: false },
      { word: "sun",   emoji: "☀️", isCorrect: false },
    ],
  },
  {
    phoneme: "/r/",
    ttsText: "r, as in rain",
    options: [
      { word: "rain",  emoji: "🌧️", isCorrect: true  },
      { word: "ball",  emoji: "⚽", isCorrect: false },
      { word: "cat",   emoji: "🐱", isCorrect: false },
    ],
  },
];

/**
 * Sanitise a pool of BeginningSound items coming from dynamic AI content.
 * A question is only valid when it has exactly one option marked isCorrect=true
 * and at least two options total. We do NOT check startsWith — that is GPT's
 * responsibility (enforced via the prompt). Removing the startsWith check
 * prevents valid AI items (e.g. "/ch/" + "chair") from being silently dropped.
 */
function sanitisePool(raw: BeginningSound[]): BeginningSound[] {
  const valid = raw.filter((item) => {
    if (!item.phoneme || !Array.isArray(item.options) || item.options.length < 2) return false;
    const correctCount = item.options.filter((o) => o.isCorrect).length;
    return correctCount === 1;
  });

  // Pad with static fallback if AI gave us fewer than 3 usable items
  if (valid.length < 3) {
    const existing = new Set(valid.map((i) => i.phoneme));
    const extras = DEFAULT_BEGINNING_SOUNDS.filter((i) => !existing.has(i.phoneme));
    return [...valid, ...extras].slice(0, 6);
  }
  return valid.slice(0, 6);
}

/**
 * Build a clear, child-friendly TTS sentence for a phoneme.
 * Passing bare isolated sounds ("wuh", "buh") to the speech engine often
 * sounds garbled. Wrapping in a natural sentence produces much cleaner audio.
 */
function buildTTSSentence(phoneme: string, exampleWord: string): string {
  const bare = phoneme.replace(/\//g, ""); // "/w/" → "w"
  return `The sound is ${bare}. Like the start of ${exampleWord}.`;
}

/** Build the initial queue from AI sounds, falling back to static defaults */
function buildQueue(sounds: BeginningSound[]): BeginningSound[] {
  const incoming = sounds && sounds.length >= 2 ? sanitisePool(sounds) : [];
  const pool     = incoming.length >= 2 ? incoming : DEFAULT_BEGINNING_SOUNDS;
  return shuffle(pool).slice(0, 6);
}

function buildInitialQueue(sounds: BeginningSound[]): BeginningSound[] {
  const incoming = sounds && sounds.length >= 2 ? sanitisePool(sounds) : [];
  const pool     = incoming.length >= 2 ? incoming : DEFAULT_BEGINNING_SOUNDS;
  return pool.slice(0, 6);
}

export function BeginningStart({ sounds, onResult, onRoundComplete }: BeginningStartProps) {
  const { speak }   = useTTS();

  // Track whether we have already been given AI data so we re-init queue
  // exactly once when real AI content arrives (sounds changes from static→AI).
  const prevSoundsRef = useRef<BeginningSound[]>(sounds);

  const [queue,    setQueue]    = useState<BeginningSound[]>(() => buildInitialQueue(sounds));
  const [index,    setIndex]    = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [selected, setSelected] = useState<string | null>(null);

  // Re-initialise queue when sounds prop changes identity AND the game hasn't
  // started yet (index === 0, no answer given). This handles the case where
  // BeginningStart mounts briefly with static data then gets AI data via props.
  useEffect(() => {
    if (sounds === prevSoundsRef.current) {
      setQueue(buildQueue(sounds));
    } else if (index === 0 && feedback === "idle") {
      prevSoundsRef.current = sounds;
      setQueue(buildQueue(sounds));
      setIndex(0);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sounds]);

  const current = queue[index];

  // Speak a clear sentence describing the phoneme sound
  useEffect(() => {
    if (!current) return;
    const correctWord = current.options.find((o) => o.isCorrect)?.word ?? "";
    const sentence = buildTTSSentence(current.phoneme, correctWord);
    const timer = setTimeout(() => speak(sentence, 0.8), 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, current]);

  const handlePick = (word: string, isCorrect: boolean) => {
    if (feedback !== "idle") return;
    onResult(isCorrect);
    setSelected(word);
    setFeedback(isCorrect ? "correct" : "wrong");

    if (isCorrect) {
      speak(`Yes! ${word} starts with ${current.phoneme.replace(/\//g, "")}`, 0.85);
    } else {
      const correctWord = current.options.find((o) => o.isCorrect)?.word ?? "";
      speak(`Not quite. ${correctWord} starts with ${current.phoneme.replace(/\//g, "")}`, 0.85);
    }

    setTimeout(() => {
      setFeedback("idle");
      setSelected(null);
      if (index + 1 >= queue.length) onRoundComplete();
      else setIndex((i) => i + 1);
    }, 1600);
  };

  const hearSound = () => {
    if (!current) return;
    const correctWord = current.options.find((o) => o.isCorrect)?.word ?? "";
    speak(buildTTSSentence(current.phoneme, correctWord), 0.8);
  };

  if (!current) return null;

  return (
    <section className="flex w-full flex-col items-center gap-5 sm:gap-6" aria-labelledby="beginning-start-title">
      <div className="text-center">
        <h2 id="beginning-start-title" className="text-xl font-bold tracking-tight text-indigo-950 sm:text-2xl">
          Which word starts with this sound?
        </h2>
        <p className="mt-1 text-base leading-relaxed text-muted">Listen to the sound, then choose a word.</p>
      </div>

      <motion.div
        key={current.phoneme}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex w-full max-w-sm flex-col items-center gap-4 rounded-panel border border-sunshine-accent/60 bg-sunshine-pastel px-6 py-6 shadow-panel sm:px-10 sm:py-7"
      >
        <span className="text-5xl font-extrabold tracking-widest text-indigo-950" aria-label={`Sound ${current.phoneme}`}>
          {current.phoneme}
        </span>

        <p className="text-base font-medium text-indigo-900">
          like in &ldquo;{current.options.find((o) => o.isCorrect)?.word}&rdquo;
        </p>

        <button
          type="button"
          onClick={hearSound}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-sunshine-accent bg-surface px-5 py-3 text-base font-semibold text-indigo-950 shadow-sm transition-colors hover:bg-sunshine-pastel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          <Volume2 size={18} className="text-amber-800" aria-hidden="true" /> Hear sound
        </button>
      </motion.div>

      <div className="grid w-full max-w-xl grid-cols-1 justify-items-center gap-3 sm:grid-cols-3 sm:gap-4" role="group" aria-label="Word choices">
        {current.options.map((opt) => {
          const state =
            selected === opt.word && feedback === "correct" ? "correct" :
            selected === opt.word && feedback === "wrong"   ? "wrong"   : "idle";

          return (
            <motion.button
              key={opt.word}
              type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => handlePick(opt.word, opt.isCorrect)}
              disabled={feedback !== "idle"}
              aria-pressed={selected === opt.word}
              aria-label={`${opt.word}${state === "correct" ? ", correct" : state === "wrong" ? ", incorrect" : ""}`}
              className={`flex min-h-36 w-full max-w-44 flex-col items-center justify-center gap-2 rounded-panel border-2 px-4 py-4 shadow-panel transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-default ${
                state === "correct" ? "border-emerald-800 bg-mint-pastel" :
                state === "wrong" ? "border-orange-800 bg-peach-pastel" :
                "border-lavender-accent bg-lavender-pastel hover:bg-lavender-accent/40"
              }`}
            >
              <span className="text-5xl leading-none" aria-hidden="true">{opt.emoji}</span>
              <span className="text-lg font-bold leading-tight text-indigo-950">{opt.word}</span>
              {selected === opt.word && (
                <span className="text-sm font-bold text-indigo-950">
                  {feedback === "correct" ? "✓ Correct" : "× Try again"}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <AnimateFeedback feedback={feedback} />

      <p className="text-sm font-semibold tabular-nums text-muted" aria-label={`Question ${index + 1} of ${queue.length}`}>
        {index + 1} of {queue.length}
      </p>
    </section>
  );
}

function AnimateFeedback({ feedback }: { feedback: "idle" | "correct" | "wrong" }) {
  if (feedback === "idle") return null;
  return (
    <motion.p
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="text-base font-semibold text-indigo-950"
      role="status"
      aria-live="polite"
    >
      {feedback === "correct" ? "✓ Correct! Great listening." : "× Try again! Listen for the first sound."}
    </motion.p>
  );
}
