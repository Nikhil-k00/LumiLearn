"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import type { StoryPassage } from "@/data/word-quest-content";

interface StoryReaderProps {
  stories: StoryPassage[];
  onAnswer: (isCorrect: boolean) => boolean;
  onRoundComplete: () => void;
  onTTSUse: () => void;
}

export function StoryReader({ stories, onAnswer, onRoundComplete, onTTSUse }: StoryReaderProps) {
  const { speak }   = useTTS();
  const [story, setStory] = useState(() => stories[0]);
  const [storyReady, setStoryReady] = useState(false);
  const [lineIdx,   setLineIdx]   = useState(0);
  const [phase,     setPhase]     = useState<"reading" | "quiz">("reading");
  const [qIdx,      setQIdx]      = useState(0);
  const [selected,  setSelected]  = useState<number | null>(null);
  const [feedback,  setFeedback]  = useState<"idle" | "correct" | "wrong">("idle");

  useEffect(() => {
    setStory(stories[Math.floor(Math.random() * stories.length)]);
    setStoryReady(true);
  }, [stories]);

  // Auto-read current line
  useEffect(() => {
    if (storyReady && phase === "reading" && story) {
      setTimeout(() => { speak(story.lines[lineIdx], 0.8); onTTSUse(); }, 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIdx, phase, storyReady, story]);

  const nextLine = () => {
    if (lineIdx + 1 < story.lines.length) {
      setLineIdx((i) => i + 1);
    } else {
      setPhase("quiz");
    }
  };

  const handleAnswer = (optionIndex: number) => {
    if (feedback !== "idle") return;
    const q = story.comprehensionQuestions[qIdx];
    const isOk = onAnswer(optionIndex === q.correct);
    setSelected(optionIndex);
    setFeedback(isOk ? "correct" : "wrong");
    speak(isOk ? "Correct! Great thinking!" : `The answer is: ${q.options[q.correct]}`);
    setTimeout(() => {
      setFeedback("idle"); setSelected(null);
      if (qIdx + 1 >= story.comprehensionQuestions.length) {
        onRoundComplete();
      } else {
        setQIdx((i) => i + 1);
      }
    }, 1400);
  };

  if (!story) return null;

  const q = story.comprehensionQuestions[qIdx];

  return (
    <section className="flex w-full flex-col items-center gap-5 sm:gap-6" aria-labelledby="story-reader-title">
      <div className="flex w-full flex-wrap items-center justify-center gap-3 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-lavender-accent/60 bg-lavender-pastel text-3xl" aria-hidden="true">
          {story.emoji}
        </span>
        <h2 id="story-reader-title" className="text-xl font-bold tracking-tight text-indigo-950 sm:text-2xl">{story.title}</h2>
        <button
          type="button"
          onClick={() => { speak(story.title); onTTSUse(); }}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-sky-accent bg-sky-pastel text-sky-800 transition-colors hover:bg-sky-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          aria-label={`Hear story title: ${story.title}`}
        >
          <Volume2 size={18} aria-hidden="true" />
        </button>
      </div>

      {phase === "reading" && (
        <AnimatePresence mode="wait">
          <motion.div
            key={lineIdx}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full rounded-panel border border-border-subtle bg-surface p-5 shadow-panel sm:p-8"
          >
            <p className="text-center text-xl leading-relaxed tracking-wide text-indigo-950 sm:text-2xl sm:leading-loose">
              {story.lines[lineIdx].split(" ").map((word, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => { speak(word); onTTSUse(); }}
                  aria-label={`Hear the word ${word}`}
                  className="mx-0.5 min-h-10 rounded px-1 underline decoration-transparent underline-offset-4 transition-colors hover:bg-sunshine-pastel hover:text-indigo-950 hover:decoration-sunshine-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
                >
                  {word}
                </button>
              ))}
            </p>
            <div className="mt-6" role="progressbar" aria-label="Story reading progress" aria-valuemin={1} aria-valuemax={story.lines.length} aria-valuenow={lineIdx + 1}>
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted">
                <span>Story progress</span><span>{lineIdx + 1} of {story.lines.length}</span>
              </div>
              <div className="flex gap-1.5">
                {story.lines.map((_, i) => (
                  <span
                    key={i}
                    className={`h-2 flex-1 rounded-full ${i <= lineIdx ? "bg-indigo-700" : "bg-lavender-pastel"}`}
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {phase === "reading" && (
        <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
          <button
            type="button"
            onClick={() => { speak(story.lines[lineIdx], 0.8); onTTSUse(); }}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-sunshine-accent/70 bg-sunshine-pastel px-5 py-3 text-base font-semibold text-indigo-950 transition-colors hover:bg-sunshine-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            <Volume2 size={17} aria-hidden="true" /> Read again
          </button>
          <button
            type="button"
            onClick={nextLine}
            className="inline-flex min-h-12 items-center justify-center rounded-control bg-indigo-700 px-6 py-3 text-base font-semibold text-white shadow-action transition-colors hover:bg-indigo-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
          >
            {lineIdx + 1 < story.lines.length ? "Next →" : "Quiz time! 🧠"}
          </button>
        </div>
      )}

      {phase === "quiz" && q && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex w-full flex-col gap-4"
          aria-labelledby="story-question"
        >
          <div className="text-center">
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">Story question {qIdx + 1} of {story.comprehensionQuestions.length}</p>
            <h3 id="story-question" className="mt-2 text-xl font-bold leading-relaxed text-indigo-950 sm:text-2xl">{q.question}</h3>
          </div>
          {q.options.map((opt, i) => (
            <motion.button
              key={i}
              type="button"
              whileTap={{ scale: 0.99 }}
              onClick={() => handleAnswer(i)}
              disabled={feedback !== "idle"}
              aria-pressed={selected === i}
              className={`w-full min-h-16 rounded-control border-2 px-5 py-4 text-left text-base font-semibold leading-relaxed transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 sm:text-lg
                ${selected === i && feedback === "correct" ? "bg-mint-pastel border-mint-accent" :
                  selected === i && feedback === "wrong"   ? "bg-peach-pastel border-peach-accent" :
                  "bg-surface border-border-strong shadow-panel hover:bg-lavender-pastel"}`}
            >
              {opt}
            </motion.button>
          ))}
          {feedback !== "idle" && (
            <p className="text-center text-base font-semibold text-indigo-950" role="status" aria-live="polite">
              {feedback === "correct" ? "Correct! Great thinking." : "Keep learning! The story has the answer."}
            </p>
          )}
        </motion.div>
      )}
    </section>
  );
}
