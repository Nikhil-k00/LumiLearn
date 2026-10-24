"use client";
import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useTTS } from "@/hooks/useTTS";
import { SoundSequenceItem, ALL_SEQUENCE_ITEMS } from "@/data/memory-content";

interface SoundSequenceProps {
  items: SoundSequenceItem[];
  minLength: number;
  maxLength: number;
  onResult: (length: number, correct: boolean) => void;
  onRoundComplete: () => void;
}

type Phase = "watching" | "input" | "correct" | "wrong";

export function SoundSequence({ items, minLength, maxLength, onResult, onRoundComplete }: SoundSequenceProps) {
  const { speak }      = useTTS();
  const [seqLength,    setSeqLength] = useState(minLength);
  const [sequence,     setSequence]  = useState<SoundSequenceItem[]>([]);
  const [playerInput,  setInput]     = useState<SoundSequenceItem[]>([]);
  const [phase,        setPhase]     = useState<Phase>("watching");
  const [activeOrb,    setActiveOrb] = useState<string | null>(null);
  const [round,        setRound]     = useState(0);
  // restartKey is incremented whenever we need a fresh game start —
  // using a separate counter means we can always force a re-run even
  // when round is already 0 (which setRound(0) cannot do).
  const [restartKey,   setRestartKey] = useState(0);
  const consecutiveRef = useRef(0);

  // Always speak exactly the label shown on the orb.
  const spokenText = (item: SoundSequenceItem) => item.label;

  // Build + play a new sequence.
  // IMPORTANT: takes the pool as a direct argument so it never reads a
  // stale closure — the caller always passes the freshest items.
  const startRound = (length: number, pool: SoundSequenceItem[]) => {
    const activePool = pool && pool.length > 0 ? pool : ALL_SEQUENCE_ITEMS.slice(0, 5);
    const seq = Array.from({ length }, () => activePool[Math.floor(Math.random() * activePool.length)]);
    setSequence(seq);
    setInput([]);
    setPhase("watching");

    let delay = 600;
    seq.forEach((item, i) => {
      setTimeout(() => {
        setActiveOrb(item.id);
        speak(spokenText(item), 0.8);
        setTimeout(() => setActiveOrb(null), 700);
      }, delay + i * 1100);
    });
    setTimeout(() => setPhase("input"), delay + seq.length * 1100 + 400);
  };

  // Fire a new round whenever round counter OR restartKey changes.
  // items is included so the effect always has the latest pool in scope.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { startRound(seqLength, items); }, [round, restartKey, items]);

  // When AI items arrive (identity change), restart the whole game cleanly.
  const prevItemsRef = useRef(items);
  useEffect(() => {
    if (items !== prevItemsRef.current) {
      prevItemsRef.current = items;
      consecutiveRef.current = 0;
      setSeqLength(minLength);
      setRound(0);
      // Always bump restartKey so the effect above re-fires even when
      // round was already 0 (first play with static → AI transition).
      setRestartKey((k) => k + 1);
    }
  }, [items, minLength]);

  const handleOrbTap = (item: SoundSequenceItem) => {
    if (phase !== "input") return;
    speak(spokenText(item), 0.8);
    setActiveOrb(item.id);
    setTimeout(() => setActiveOrb(null), 400);

    const newInput = [...playerInput, item];
    setInput(newInput);

    // Check correctness at each step
    const pos = newInput.length - 1;
    if (newInput[pos].id !== sequence[pos].id) {
      // Wrong
      setPhase("wrong");
      onResult(seqLength, false);
      consecutiveRef.current = 0;
      if (seqLength > minLength) setSeqLength((l) => l - 1);
      setTimeout(() => {
        if (round >= 5) { onRoundComplete(); return; }
        setRound((r) => r + 1);
      }, 1400);
      return;
    }

    if (newInput.length === sequence.length) {
      // Correct complete
      setPhase("correct");
      onResult(seqLength, true);
      consecutiveRef.current += 1;
      if (consecutiveRef.current >= 2 && seqLength < maxLength) {
        setSeqLength((l) => l + 1);
        consecutiveRef.current = 0;
      }
      speak(`Amazing! You remembered ${seqLength}!`);
      setTimeout(() => {
        if (round >= 5) { onRoundComplete(); return; }
        setRound((r) => r + 1);
      }, 1600);
    }
  };

  return (
    <section className="flex w-full flex-col items-center gap-6" aria-labelledby="sound-sequence-title">
      <div className="text-center">
        <h2 id="sound-sequence-title" className="text-xl font-bold tracking-tight text-indigo-950 sm:text-2xl">
          {phase === "watching" ? "👀 Watch the sequence..." :
           phase === "input"    ? "🎯 Now tap in order!" :
           phase === "correct"  ? "🌟 Correct!" : "💪 Try again!"}
        </h2>
        <p className="mt-1 text-base leading-relaxed text-muted">
          {phase === "watching" ? "Listen and watch each sound, then repeat them in order." : "Tap the sounds in the same order."}
        </p>
        <p className="mt-2 text-sm font-semibold text-indigo-800">Sequence length: {seqLength}</p>
      </div>

      <div className="grid w-full max-w-2xl grid-cols-2 justify-items-center gap-3 sm:grid-cols-3 sm:gap-5">
        {items.slice(0, 6).map((item) => (
          <motion.button
            key={item.id}
            animate={activeOrb === item.id ? { scale: 1.1, opacity: 1 } : { scale: 1, opacity: phase === "input" ? 1 : 0.6 }}
            transition={{ duration: 0.2 }}
            onClick={() => handleOrbTap(item)}
            disabled={phase !== "input"}
            aria-label={`${item.label}${activeOrb === item.id ? ", active sound" : ""}`}
            aria-pressed={activeOrb === item.id}
            className={`flex h-32 w-32 flex-col items-center justify-center rounded-full border-4 font-bold shadow-panel transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 disabled:cursor-default sm:h-36 sm:w-36 motion-reduce:transform-none
                        ${activeOrb === item.id ? "border-indigo-800 ring-4 ring-indigo-700/20" : "border-transparent"}
                        ${item.color}`}
          >
            <span className="mb-1 text-5xl sm:text-6xl" aria-hidden="true">{item.emoji}</span>
            <span className="mt-1 text-sm font-semibold text-indigo-950">{item.label}</span>
          </motion.button>
        ))}
      </div>

      <div className="w-full max-w-md" role="progressbar" aria-label="Sequence replay progress" aria-valuemin={0} aria-valuemax={sequence.length} aria-valuenow={playerInput.length}>
        <div className="mb-2 flex items-center justify-between text-xs font-semibold text-muted">
          <span>Your sequence</span><span>{playerInput.length} of {sequence.length}</span>
        </div>
        <div className="flex gap-2" aria-hidden="true">
          {sequence.map((_, i) => (
            <span key={i} className={`h-2.5 flex-1 rounded-full ${i < playerInput.length ? "bg-indigo-700" : "bg-lavender-pastel"}`} />
          ))}
        </div>
      </div>

      <p className="text-sm font-semibold tabular-nums text-muted" aria-label={`Round ${round + 1} of 6`}>
        Round {round + 1} of 6
      </p>
      {(phase === "correct" || phase === "wrong") && (
        <p className="text-base font-semibold text-indigo-950" role="status" aria-live="polite">
          {phase === "correct" ? "✓ Sequence remembered!" : "↻ Not quite. Listen to the next sequence."}
        </p>
      )}
    </section>
  );
}
