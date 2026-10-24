"use client";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";

interface LetterCardProps {
  letter: string;
  emoji: string;       // animal/object that starts with this letter
  hint: string;        // mnemonic hint text
  onClick?: () => void;
  variant?: "default" | "correct" | "wrong" | "selected";
  size?: "md" | "lg";
}

const variantStyles: Record<string, string> = {
  default:  "bg-lavender-pastel border-lavender-accent hover:shadow-card-hover hover:scale-105",
  correct:  "bg-mint-pastel   border-mint-accent   scale-105",
  wrong:    "bg-peach-pastel  border-peach-accent",
  selected: "bg-sky-pastel    border-sky-accent    scale-105",
};

export function LetterCard({ letter, emoji, hint, onClick, variant = "default", size = "lg" }: LetterCardProps) {
  const { speak } = useTTS();
  const fontSize   = size === "lg" ? "text-[56px] sm:text-[72px]" : "text-[48px] sm:text-[56px]";
  const cardSize   = size === "lg" ? "w-28 h-28 sm:w-36 sm:h-36"  : "w-24 h-24 sm:w-28 sm:h-28";

  return (
    <motion.div
      className={`relative flex flex-col items-center justify-center rounded-card border-2 cursor-pointer select-none
                  transition-all duration-200 shadow-card ${cardSize} ${variantStyles[variant]}`}
      whileTap={{ scale: 0.95 }}
      animate={variant === "wrong" ? { x: [0, -6, 6, -6, 6, 0] } : {}}
      transition={{ duration: 0.35 }}
      onClick={onClick}
    >
      {/* Audio button — top right */}
      <button
        className="absolute top-2 right-2 p-1.5 rounded-full bg-white/70 hover:bg-white transition"
        onClick={(e) => { e.stopPropagation(); speak(`${letter}. ${hint}`); }}
        aria-label={`Hear letter ${letter}`}
      >
        <Volume2 size={18} className="text-lavender-accent" />
      </button>

      <span className="text-4xl leading-none">{emoji}</span>
      <span className={`font-bold leading-none mt-2 tracking-wide ${fontSize} text-indigo-900`}>{letter}</span>
      <span className="text-[13px] text-indigo-400 mt-2 text-center px-2 leading-tight">{hint}</span>
    </motion.div>
  );
}
