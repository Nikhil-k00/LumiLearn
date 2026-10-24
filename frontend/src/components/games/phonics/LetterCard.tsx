"use client";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { useTTS } from "@/hooks/useTTS";

interface LetterCardProps {
  letter: string;
  emoji: string;       // animal/object that starts with this letter
  hint: string;        // mnemonic hint text
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
  variant?: "default" | "correct" | "wrong" | "selected";
  size?: "md" | "lg";
}

const variantStyles: Record<string, string> = {
  default:  "bg-lavender-pastel border-lavender-accent hover:shadow-card-hover",
  correct:  "bg-mint-pastel border-mint-accent",
  wrong:    "bg-peach-pastel border-peach-accent",
  selected: "bg-sky-pastel border-sky-accent",
};

export function LetterCard({ letter, emoji, hint, onClick, disabled = false, selected = false, variant = "default", size = "lg" }: LetterCardProps) {
  const { speak } = useTTS();
  const fontSize = size === "lg" ? "text-5xl sm:text-6xl" : "text-4xl sm:text-5xl";
  const cardSize = size === "lg" ? "min-h-36 min-w-32 sm:min-h-40 sm:min-w-36" : "min-h-28 min-w-28 sm:min-h-32 sm:min-w-32";

  return (
    <div className="relative">
      <motion.button
        type="button"
        disabled={disabled}
        className={`flex w-full flex-col items-center justify-center gap-1 rounded-panel border-2 px-3 pb-3 pt-10 text-center shadow-panel
                    transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2
                    disabled:cursor-default ${cardSize} ${variantStyles[variant]}`}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        animate={variant === "wrong" ? { x: [0, -4, 4, -4, 4, 0] } : {}}
        transition={{ duration: 0.3 }}
        onClick={onClick}
        aria-label={`${letter}, ${hint}`}
        aria-pressed={selected}
      >
        <span className="text-3xl leading-none sm:text-4xl" aria-hidden="true">{emoji}</span>
        <span className={`mt-1 font-bold leading-none tracking-wide text-indigo-950 ${fontSize}`} aria-hidden="true">{letter}</span>
        <span className="mt-1 text-sm leading-tight text-indigo-900">{hint}</span>
      </motion.button>
      <button
        type="button"
        className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-indigo-800 transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2"
        onClick={() => speak(`${letter}. ${hint}`)}
        aria-label={`Hear letter ${letter}`}
      >
        <Volume2 size={18} aria-hidden="true" />
      </button>
    </div>
  );
}
