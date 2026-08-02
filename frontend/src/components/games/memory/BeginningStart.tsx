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

export function BeginningStart({ sounds, onResult, onRoundComplete }: BeginningStartProps) {
  const { speak }   = useTTS();

  // Track whether we have already been given AI data so we re-init queue
  // exactly once when real AI content arrives (sounds changes from static→AI).
  const prevSoundsRef = useRef<BeginningSound[]>(sounds);

  const [queue,    setQueue]    = useState<BeginningSound[]>(() => buildQueue(sounds));
  const [index,    setIndex]    = useState(0);
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");
  const [selected, setSelected] = useState<string | null>(null);

  // Re-initialise queue when sounds prop changes identity AND the game hasn't
  // started yet (index === 0, no answer given). This handles the case where
  // BeginningStart mounts briefly with static data then gets AI data via props.
  useEffect(() => {
    if (sounds !== prevSoundsRef.current && index === 0 && feedback === "idle") {
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
    <div className="flex flex-col items-center gap-6 w-full">
      <p className="text-game text-indigo-700 font-semibold text-center">
        Which word starts with this sound?
      </p>

      {/* Phoneme display card */}
      <motion.div
        key={current.phoneme}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center gap-4 bg-sunshine-pastel rounded-card px-10 py-7 shadow-card w-full max-w-xs"
      >
        {/* Large, bold phoneme */}
        <span className="text-5xl font-extrabold text-indigo-900 tracking-widest">
          {current.phoneme}
        </span>

        {/* Example word hint */}
        <p className="text-sm text-indigo-500 font-medium">
          like in &ldquo;{current.options.find((o) => o.isCorrect)?.word}&rdquo;
        </p>

        <button
          onClick={hearSound}
          className="flex items-center gap-2 px-5 py-2 rounded-button bg-white/90
                     border border-sunshine-accent text-indigo-800 text-base font-semibold
                     hover:bg-white transition-all shadow-sm"
        >
          <Volume2 size={18} className="text-amber-600" /> Hear it
        </button>
      </motion.div>

      {/* Answer options — larger cards, more readable for children */}
      <div className="flex gap-5 flex-wrap justify-center">
        {current.options.map((opt) => {
          const state =
            selected === opt.word && feedback === "correct" ? "correct" :
            selected === opt.word && feedback === "wrong"   ? "wrong"   : "idle";

          return (
            <motion.button
              key={opt.word}
              whileTap={{ scale: 0.93 }}
              onClick={() => handlePick(opt.word, opt.isCorrect)}
              disabled={feedback !== "idle"}
              className={`w-32 h-32 rounded-card border-2 flex flex-col items-center
                          justify-center gap-2 shadow-card transition-all
                          ${state === "correct" ? "bg-mint-pastel   border-mint-accent   scale-105" :
                            state === "wrong"   ? "bg-peach-pastel  border-peach-accent" :
                                                  "bg-lavender-pastel border-lavender-accent hover:shadow-card-hover hover:scale-105"}`}
            >
              <span className="text-5xl leading-none">{opt.emoji}</span>
              <span className="text-lg font-bold text-indigo-900 leading-tight">{opt.word}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Feedback banner */}
      <AnimateFeedback feedback={feedback} />

      <p className="text-base text-indigo-400">{index + 1} / {queue.length}</p>
    </div>
  );
}

function AnimateFeedback({ feedback }: { feedback: "idle" | "correct" | "wrong" }) {
  if (feedback === "idle") return null;
  return (
    <motion.p
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`text-2xl font-bold ${feedback === "correct" ? "text-mint-accent" : "text-peach-accent"}`}
    >
      {feedback === "correct" ? "🌟 Correct!" : "💪 Try again!"}
    </motion.p>
  );
}
