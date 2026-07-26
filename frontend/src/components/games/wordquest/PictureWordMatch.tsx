"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";
import type { WordPicturePair } from "@/data/word-quest-content";

interface PictureWordMatchProps {
  pairs: WordPicturePair[];
  onAnswer: (isCorrect: boolean) => boolean;
  onRoundComplete: () => void;
  onTTSUse: () => void;
}

function shuffle<T>(arr: T[]): T[] { return [...arr].sort(() => Math.random() - 0.5); }

export function PictureWordMatch({ pairs, onAnswer, onRoundComplete, onTTSUse }: PictureWordMatchProps) {
  const { speak }   = useTTS();
  const [queue]     = useState(() => shuffle(pairs).slice(0, 8));
  const [index,     setIndex]   = useState(0);
  const [options,   setOptions] = useState<WordPicturePair[]>([]);
  const [feedback,  setFeedback]= useState<"idle" | "correct" | "wrong">("idle");
  const [selected,  setSelected]= useState<string | null>(null);

  const current = queue[index];

  useEffect(() => {
    if (current) {
      const others = shuffle(pairs.filter((p) => p.word !== current.word)).slice(0, 3);
      setOptions(shuffle([current, ...others]));
    }
  }, [index, current, pairs]);

  const handlePick = (word: string) => {
    if (feedback !== "idle") return;
    const isOk = onAnswer(word === current.word);
    setSelected(word);
    setFeedback(isOk ? "correct" : "wrong");
    speak(isOk ? `Yes! ${current.word}!` : `This is ${current.word}. Try again!`);
    setTimeout(() => {
      setFeedback("idle"); setSelected(null);
      if (index + 1 >= queue.length) onRoundComplete();
      else setIndex((i) => i + 1);
    }, 1200);
  };

  if (!current) return null;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Picture target */}
      <motion.div key={current.word} initial={{ scale: 0.8 }} animate={{ scale: 1 }}
        className="text-8xl bg-sunshine-pastel rounded-card p-6 shadow-card">
        {current.emoji}
      </motion.div>
      <p className="text-game text-indigo-700 font-medium">Which word matches this picture?</p>

      {/* Word options — each has TTS button */}
      <div className="grid grid-cols-2 gap-4 w-full px-2">
        {options.map((opt) => (
          <motion.div key={opt.word} whileTap={{ scale: 0.95 }} className="relative">
            <button
              onClick={() => handlePick(opt.word)}
              className={`w-full py-8 px-4 rounded-card border-2 text-3xl font-bold transition-all shadow-card
                ${selected === opt.word && feedback === "correct" ? "bg-mint-pastel border-mint-accent" :
                  selected === opt.word && feedback === "wrong"   ? "bg-peach-pastel border-peach-accent" :
                  "bg-white border-lavender-accent hover:shadow-card-hover hover:bg-lavender-pastel"}`}
            >
              {opt.word}
            </button>
            {/* TTS button overlay */}
            <button
              onClick={(e) => { e.stopPropagation(); speak(opt.word); onTTSUse(); }}
              className="absolute top-2 right-2 p-2 rounded-full bg-sky-pastel border border-sky-accent"
              aria-label={`Hear ${opt.word}`}
            >
              <Volume2 size={20} className="text-sky-700" />
            </button>
          </motion.div>
        ))}
      </div>
      <p className="text-base text-indigo-400">{index + 1} / {queue.length}</p>
    </div>
  );
}
