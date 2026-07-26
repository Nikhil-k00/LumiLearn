"use client";
import { useState, useCallback } from "react";
import type { MistakeLogEntry } from "@shared/types";

export interface PhonicsSessionState {
  score: number;
  accuracy: number;
  attempts: number;
  correctCount: number;
  mistakeLog: MistakeLogEntry[];
  confusionMatrix: Record<string, number>;
  startTime: number;
}

export function usePhonicsSession() {
  const [session, setSession] = useState<PhonicsSessionState>({
    score: 0,
    accuracy: 100,
    attempts: 0,
    correctCount: 0,
    mistakeLog: [],
    confusionMatrix: {},
    startTime: Date.now(),
  });

  const recordAnswer = useCallback((item: string, studentAnswer: string, correct: string) => {
    const isCorrect = studentAnswer.toLowerCase() === correct.toLowerCase();

    setSession((prev) => {
      const newAttempts    = prev.attempts + 1;
      const newCorrect     = prev.correctCount + (isCorrect ? 1 : 0);
      const newAccuracy    = Math.round((newCorrect / newAttempts) * 100);
      const newScore       = prev.score + (isCorrect ? 10 : 0);
      const newMistakeLog  = isCorrect ? prev.mistakeLog : [...prev.mistakeLog, { item, studentAnswer, correct }];

      // Track confusion matrix for b/d/p/q/m/w swaps
      const newMatrix = { ...prev.confusionMatrix };
      if (!isCorrect) {
        const key = `${studentAnswer.toLowerCase()}_for_${correct.toLowerCase()}`;
        newMatrix[key] = (newMatrix[key] ?? 0) + 1;
      }

      return {
        ...prev,
        score: newScore,
        accuracy: newAccuracy,
        attempts: newAttempts,
        correctCount: newCorrect,
        mistakeLog: newMistakeLog,
        confusionMatrix: newMatrix,
      };
    });

    return isCorrect;
  }, []);

  const getDuration = useCallback(() => Math.round((Date.now() - session.startTime) / 1000), [session.startTime]);

  const reset = useCallback(() => {
    setSession({ score: 0, accuracy: 100, attempts: 0, correctCount: 0, mistakeLog: [], confusionMatrix: {}, startTime: Date.now() });
  }, []);

  return { session, recordAnswer, getDuration, reset };
}
