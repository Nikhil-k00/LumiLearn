"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2, CheckCircle } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import type { Sentence } from "@/data/word-quest-content";

interface SentenceBuilderProps {
  sentences: Sentence[];
  onAnswer: (isCorrect: boolean) => boolean;
  onRoundComplete: () => void;
  onTTSUse: () => void;
}

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

/**
 * Normalise a sentence's word list.
 * GPT occasionally returns the whole sentence as one string element
 * e.g. ["Nest in tree"] instead of ["Nest", "in", "tree"].
 * Split any element that contains a space so the game always gets
 * individual word tiles regardless of what the AI returned.
 */
function normaliseWords(words: string[]): string[] {
  return words.flatMap((w) => w.trim().split(/\s+/).filter(Boolean));
}

export function SentenceBuilder({ sentences, onAnswer, onRoundComplete, onTTSUse }: SentenceBuilderProps) {
  const { speak }  = useTTS();
  const [queue]    = useState(() =>
    shuffle(sentences)
      .slice(0, 5)
      .map((s) => ({ ...s, words: normaliseWords(s.words) }))
  );
  const [index,    setIndex]    = useState(0);
  const [pool,     setPool]     = useState<string[]>([]);
  const [built,    setBuilt]    = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");

  const current = queue[index];

  useEffect(() => {
    if (current) {
      setPool(shuffle([...current.words]));
      setBuilt([]);
      setFeedback("idle");
    }
  }, [index, current]);

  const pickWord = (word: string, poolIdx: number) => {
    if (feedback !== "idle") return;
    setPool((p) => p.filter((_, i) => i !== poolIdx));
    setBuilt((b) => [...b, word]);
    speak(word); onTTSUse();
  };

  const removeWord = (builtIdx: number) => {
    if (feedback !== "idle") return;
    setPool((p) => [...p, built[builtIdx]]);
    setBuilt((b) => b.filter((_, i) => i !== builtIdx));
  };

  const checkSentence = () => {
    const isOk = built.join(" ") === current.words.join(" ");
    onAnswer(isOk);
    setFeedback(isOk ? "correct" : "wrong");
    if (isOk) {
      speak(current.words.join(" "));
      setTimeout(() => {
        setFeedback("idle");
        if (index + 1 >= queue.length) onRoundComplete();
        else setIndex((i) => i + 1);
      }, 1500);
    } else {
      speak("Try rearranging the words. You can do it!");
      setTimeout(() => {
        // Reset for retry
        setPool(shuffle([...current.words]));
        setBuilt([]);
        setFeedback("idle");
      }, 1400);
    }
  };

  if (!current) return null;

  return (
    <div className="flex flex-col items-center gap-5">
      <div className="text-5xl">{current.emoji}</div>
      <p className="text-game text-indigo-700 font-medium text-center">
        Build the sentence! Tap words in order.
      </p>

      {/* Assembly area */}
      <div className="min-h-[100px] w-full flex flex-wrap gap-4 items-center
                      bg-white/70 rounded-card px-6 py-6 shadow-card border border-lavender-accent/30">
        {built.length === 0
          ? <p className="text-indigo-300 text-xl">Tap words below to build the sentence...</p>
          : built.map((w, i) => (
            <motion.button key={`${w}-${i}`} initial={{ scale: 0 }} animate={{ scale: 1 }}
              onClick={() => removeWord(i)}
              className="px-6 py-4 rounded-2xl bg-lavender-pastel border-2 border-lavender-accent
                         text-3xl font-semibold text-indigo-900 shadow-sm">
              {w}
            </motion.button>
          ))
        }
      </div>

      {/* Word pool */}
      <div className="flex flex-wrap gap-4 justify-center mt-2">
        {pool.map((w, i) => (
          <motion.button key={`pool-${w}-${i}`} whileTap={{ scale: 0.9 }}
            onClick={() => pickWord(w, i)}
            className="px-8 py-6 rounded-2xl bg-sky-pastel border-4 border-sky-accent
                       text-4xl font-bold text-indigo-900 shadow-card hover:shadow-card-hover">
            {w}
          </motion.button>
        ))}
      </div>

      {/* Check + TTS */}
      <div className="flex gap-3">
        {built.length === current.words.length && feedback === "idle" && (
          <button onClick={checkSentence}
            className="flex items-center gap-2 px-6 py-3 rounded-button bg-mint-accent text-white font-semibold shadow-btn-mint">
            <CheckCircle size={18} /> Check
          </button>
        )}
        <button onClick={() => { speak(current.words.join(" ")); onTTSUse(); }}
          className="flex items-center gap-2 px-4 py-3 rounded-button bg-sunshine-pastel border border-sunshine-accent text-indigo-800">
          <Volume2 size={16} /> Hear sentence
        </button>
      </div>

      {feedback === "correct" && <p className="text-2xl font-bold text-mint-accent">🌟 Perfect sentence!</p>}
      {feedback === "wrong"   && <p className="text-xl text-peach-accent font-semibold">💪 Try again!</p>}

      <p className="text-base text-indigo-400">{index + 1} / {queue.length}</p>
    </div>
  );
}
