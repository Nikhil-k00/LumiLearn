"use client";
import { useState, useCallback } from "react";

export interface MemorySessionState {
  score: number;
  sequenceAccuracy: number;
  maxSequenceRecalled: number;
  rhymeScore: number;
  attempts: number;
  startTime: number;
}

export function useMemorySession() {
  const [session, setSession] = useState<MemorySessionState>({
    score: 0, sequenceAccuracy: 100, maxSequenceRecalled: 2,
    rhymeScore: 100, attempts: 0, startTime: Date.now(),
  });

  const recordSequence = useCallback((length: number, correct: boolean) => {
    setSession((prev) => {
      const attempts  = prev.attempts + 1;
      const newMax    = correct ? Math.max(prev.maxSequenceRecalled, length) : prev.maxSequenceRecalled;
      const prevTotal = prev.sequenceAccuracy * (attempts - 1);
      const newAcc    = Math.round((prevTotal + (correct ? 100 : 0)) / attempts);
      return {
        ...prev,
        attempts,
        maxSequenceRecalled: newMax,
        sequenceAccuracy: newAcc,
        score: prev.score + (correct ? length * 5 : 0),
      };
    });
  }, []);

  const recordRhyme = useCallback((isCorrect: boolean) => {
    setSession((prev) => {
      const attempts  = prev.attempts + 1;
      const prevTotal = prev.rhymeScore * (attempts - 1);
      return {
        ...prev,
        attempts,
        rhymeScore: Math.round((prevTotal + (isCorrect ? 100 : 0)) / attempts),
        score: prev.score + (isCorrect ? 8 : 0),
      };
    });
  }, []);

  const getDuration = useCallback(() => Math.round((Date.now() - session.startTime) / 1000), [session.startTime]);
  const reset = useCallback(() => {
    setSession({ score: 0, sequenceAccuracy: 100, maxSequenceRecalled: 2, rhymeScore: 100, attempts: 0, startTime: Date.now() });
  }, []);

  return { session, recordSequence, recordRhyme, getDuration, reset };
}
