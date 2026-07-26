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
  const [story]     = useState(() => stories[Math.floor(Math.random() * stories.length)]);
  const [lineIdx,   setLineIdx]   = useState(0);
  const [phase,     setPhase]     = useState<"reading" | "quiz">("reading");
  const [qIdx,      setQIdx]      = useState(0);
  const [selected,  setSelected]  = useState<number | null>(null);
  const [feedback,  setFeedback]  = useState<"idle" | "correct" | "wrong">("idle");

  // Auto-read current line
  useEffect(() => {
    if (phase === "reading" && story) {
      setTimeout(() => { speak(story.lines[lineIdx], 0.8); onTTSUse(); }, 400);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineIdx, phase]);

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
    <div className="flex flex-col items-center gap-5">
      <div className="flex items-center gap-2">
        <span className="text-4xl">{story.emoji}</span>
        <h3 className="text-xl font-bold text-indigo-900">{story.title}</h3>
        <button onClick={() => { speak(story.title); onTTSUse(); }}
          className="p-2 rounded-full bg-sky-pastel border border-sky-accent">
          <Volume2 size={16} className="text-sky-700" />
        </button>
      </div>

      {phase === "reading" && (
        <AnimatePresence mode="wait">
          <motion.div key={lineIdx}
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
            className="w-full bg-white/80 rounded-card p-6 shadow-card border border-lavender-accent/20">
            {/* Render each word tappable for TTS — karaoke reading */}
            <p className="text-game text-indigo-900 leading-reading">
              {story.lines[lineIdx].split(" ").map((word, i) => (
                <button key={i} onClick={() => { speak(word); onTTSUse(); }}
                  className="hover:bg-sunshine-pastel hover:text-indigo-900 rounded px-0.5 mx-0.5
                             transition-colors underline-offset-2">
                  {word}
                </button>
              ))}
            </p>
            {/* Progress dots */}
            <div className="flex gap-1 mt-4 justify-center">
              {story.lines.map((_, i) => (
                <div key={i} className={`h-2 w-2 rounded-full ${i <= lineIdx ? "bg-lavender-accent" : "bg-lavender-pastel"}`} />
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Next / Read aloud */}
      {phase === "reading" && (
        <div className="flex gap-3">
          <button onClick={() => { speak(story.lines[lineIdx], 0.8); onTTSUse(); }}
            className="flex items-center gap-2 px-4 py-3 rounded-button bg-sunshine-pastel border border-sunshine-accent text-indigo-800">
            <Volume2 size={16} /> Read again
          </button>
          <button onClick={nextLine}
            className="px-6 py-3 rounded-button bg-lavender-accent text-white font-semibold shadow-btn">
            {lineIdx + 1 < story.lines.length ? "Next →" : "Quiz time! 🧠"}
          </button>
        </div>
      )}

      {/* Quiz */}
      {phase === "quiz" && q && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full flex flex-col gap-4">
          <p className="text-game font-semibold text-indigo-900 text-center">{q.question}</p>
          {q.options.map((opt, i) => (
            <motion.button key={i} whileTap={{ scale: 0.97 }}
              onClick={() => handleAnswer(i)}
              className={`w-full py-4 px-5 rounded-card text-game font-medium text-left border-2 transition-all shadow-card
                ${selected === i && feedback === "correct" ? "bg-mint-pastel border-mint-accent" :
                  selected === i && feedback === "wrong"   ? "bg-peach-pastel border-peach-accent" :
                  "bg-white border-lavender-accent hover:bg-lavender-pastel"}`}>
              {opt}
            </motion.button>
          ))}
        </motion.div>
      )}
    </div>
  );
}
