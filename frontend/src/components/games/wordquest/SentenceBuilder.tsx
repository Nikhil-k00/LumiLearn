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
  const [queue, setQueue] = useState(() =>
    sentences
      .slice(0, 5)
      .map((s) => ({ ...s, words: normaliseWords(s.words) }))
  );
  const [queueReady, setQueueReady] = useState(false);
  const [index,    setIndex]    = useState(0);
  const [pool,     setPool]     = useState<string[]>([]);
  const [built,    setBuilt]    = useState<string[]>([]);
  const [feedback, setFeedback] = useState<"idle" | "correct" | "wrong">("idle");

  const current = queue[index];

  useEffect(() => {
    setQueue(shuffle(sentences)
      .slice(0, 5)
      .map((s) => ({ ...s, words: normaliseWords(s.words) })));
    setQueueReady(true);
  }, [sentences]);

  useEffect(() => {
    if (queueReady && current) {
      setPool(shuffle([...current.words]));
      setBuilt([]);
      setFeedback("idle");
    }
  }, [index, current, queueReady]);

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
    <section className="flex w-full flex-col items-center gap-5 sm:gap-6" aria-labelledby="sentence-builder-title">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-sunshine-accent/60 bg-sunshine-pastel text-4xl shadow-panel" aria-hidden="true">
        {current.emoji}
      </div>
      <div className="text-center">
        <h2 id="sentence-builder-title" className="text-xl font-bold tracking-tight text-indigo-950 sm:text-2xl">
          Build the sentence
        </h2>
        <p className="mt-1 text-base leading-relaxed text-muted">Tap each word in the order that makes sense.</p>
      </div>

      <div
        className="flex min-h-28 w-full flex-wrap items-center justify-center gap-3 rounded-panel border border-border-subtle bg-surface-soft/70 px-4 py-5 sm:gap-4 sm:px-6"
        aria-label="Your sentence"
        aria-live="polite"
      >
        {built.length === 0
          ? <p className="text-center text-base leading-relaxed text-muted">Your sentence will appear here.</p>
          : built.map((w, i) => (
            <motion.button
              key={`${w}-${i}`}
              type="button"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              onClick={() => removeWord(i)}
              disabled={feedback !== "idle"}
              aria-label={`Remove ${w} from your sentence`}
              className="rounded-control border border-lavender-accent bg-lavender-pastel px-4 py-3 text-xl font-semibold text-indigo-950 shadow-sm transition-colors hover:bg-lavender-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 sm:text-2xl"
            >
              {w}<span className="sr-only">, remove from sentence</span>
            </motion.button>
          ))
        }
      </div>

      <div className="flex w-full flex-wrap justify-center gap-3 sm:gap-4" aria-label="Available words">
        {pool.map((w, i) => (
          <motion.button
            key={`pool-${w}-${i}`}
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => pickWord(w, i)}
            disabled={feedback !== "idle"}
            className="min-h-16 rounded-panel border-2 border-sky-accent bg-sky-pastel px-5 py-4 text-xl font-bold text-indigo-950 shadow-panel transition-colors hover:bg-sky-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 sm:text-2xl"
          >
            {w}
          </motion.button>
        ))}
      </div>

      <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
        {built.length === current.words.length && feedback === "idle" && (
          <button
            type="button"
            onClick={checkSentence}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control bg-indigo-700 px-6 py-3 text-base font-semibold text-white shadow-action transition-colors hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            <CheckCircle size={18} aria-hidden="true" /> Check sentence
          </button>
        )}
        <button
          type="button"
          onClick={() => { speak(current.words.join(" ")); onTTSUse(); }}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-sunshine-accent/70 bg-sunshine-pastel px-5 py-3 text-base font-semibold text-indigo-950 transition-colors hover:bg-sunshine-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        >
          <Volume2 size={17} aria-hidden="true" /> Hear sentence
        </button>
      </div>

      {feedback !== "idle" && (
        <p
          className={`text-base font-semibold ${feedback === "correct" ? "text-success" : "text-error"}`}
          role="status"
          aria-live="polite"
        >
          {feedback === "correct" ? "Perfect sentence! You got it." : "Not quite. Try rearranging the words."}
        </p>
      )}

      <p className="text-sm font-semibold tabular-nums text-muted" aria-label={`Sentence ${index + 1} of ${queue.length}`}>
        {index + 1} of {queue.length}
      </p>
    </section>
  );
}
