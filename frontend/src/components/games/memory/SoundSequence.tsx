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
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <p className="text-game text-indigo-700 font-semibold">
          {phase === "watching" ? "👀 Watch the sequence..." :
           phase === "input"    ? "🎯 Now tap in order!" :
           phase === "correct"  ? "🌟 Correct!" : "💪 Try again!"}
        </p>
        <p className="text-base text-indigo-400 mt-1">Sequence length: {seqLength}</p>
      </div>

      {/* Orbs grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {items.slice(0, 6).map((item) => (
          <motion.button
            key={item.id}
            animate={activeOrb === item.id ? { scale: 1.1, opacity: 1 } : { scale: 1, opacity: phase === "input" ? 1 : 0.6 }}
            transition={{ duration: 0.2 }}
            onClick={() => handleOrbTap(item)}
            disabled={phase !== "input"}
            className={`w-32 h-32 rounded-full border-4 flex flex-col items-center justify-center
                        shadow-card transition-all font-bold
                        ${activeOrb === item.id ? "border-lavender-accent scale-105" : "border-transparent"}
                        ${item.color}`}
          >
            <span className="text-6xl mb-1">{item.emoji}</span>
            <span className="text-[14px] text-indigo-700 mt-1">{item.label}</span>
          </motion.button>
        ))}
      </div>

      {/* Player progress */}
      <div className="flex gap-2">
        {sequence.map((_, i) => (
          <div key={i} className={`w-3 h-3 rounded-full ${i < playerInput.length ? "bg-lavender-accent" : "bg-lavender-pastel"}`} />
        ))}
      </div>

      <p className="text-base text-indigo-400">Round {round + 1} / 6</p>
    </div>
  );
}
