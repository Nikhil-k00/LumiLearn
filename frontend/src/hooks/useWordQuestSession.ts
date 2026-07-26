"use client";
import { useState, useCallback } from "react";

export interface WordQuestSessionState {
  score: number;
  accuracy: number;
  attempts: number;
  correctCount: number;
  ttsUsageCount: number;
  startTime: number;
}

export function useWordQuestSession() {
  const [session, setSession] = useState<WordQuestSessionState>({
    score: 0, accuracy: 100, attempts: 0,
    correctCount: 0, ttsUsageCount: 0, startTime: Date.now(),
  });

  const recordAnswer = useCallback((isCorrect: boolean) => {
    setSession((prev) => {
      const attempts  = prev.attempts + 1;
      const correct   = prev.correctCount + (isCorrect ? 1 : 0);
      return {
        ...prev,
        attempts,
        correctCount: correct,
        accuracy: Math.round((correct / attempts) * 100),
        score: prev.score + (isCorrect ? 10 : 0),
      };
    });
    return isCorrect;
  }, []);

  const recordTTSUsage = useCallback(() => {
    setSession((prev) => ({ ...prev, ttsUsageCount: prev.ttsUsageCount + 1 }));
  }, []);

  const getDuration = useCallback(() => Math.round((Date.now() - session.startTime) / 1000), [session.startTime]);
  const reset = useCallback(() => {
    setSession({ score: 0, accuracy: 100, attempts: 0, correctCount: 0, ttsUsageCount: 0, startTime: Date.now() });
  }, []);

  return { session, recordAnswer, recordTTSUsage, getDuration, reset };
}
