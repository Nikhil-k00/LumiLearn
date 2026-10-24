"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { MotionConfig } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────

export type FontMode = "lexend" | "opendyslexic";

export interface AccessibilityState {
  fontMode: FontMode;
  largeText: boolean;
  highContrast: boolean;
  reducedMotion: boolean;
  toggleFontMode: () => void;
  toggleLargeText: () => void;
  toggleHighContrast: () => void;
  toggleReducedMotion: () => void;
}

// ─── Context ───────────────────────────────────────────────────────────────

const AccessibilityContext = createContext<AccessibilityState | null>(null);

export function useAccessibility(): AccessibilityState {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) throw new Error("useAccessibility must be used within AccessibilityProvider");
  return ctx;
}

// ─── Provider ──────────────────────────────────────────────────────────────

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [fontMode, setFontMode] = useState<FontMode>("lexend");
  const [largeText, setLargeText] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  const toggleFontMode = useCallback(() => {
    setFontMode((prev) => {
      const next = prev === "lexend" ? "opendyslexic" : "lexend";
      document.documentElement.setAttribute("data-font", next);
      return next;
    });
  }, []);

  const toggleLargeText = useCallback(() => {
    setLargeText((prev) => {
      const next = !prev;
      document.documentElement.setAttribute("data-large-text", String(next));
      return next;
    });
  }, []);

  const toggleHighContrast = useCallback(() => {
    setHighContrast((prev) => {
      const next = !prev;
      document.documentElement.setAttribute("data-high-contrast", String(next));
      return next;
    });
  }, []);

  const toggleReducedMotion = useCallback(() => {
    setReducedMotion((prev) => {
      const next = !prev;
      document.documentElement.setAttribute("data-reduced-motion", String(next));
      return next;
    });
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        fontMode,
        largeText,
        highContrast,
        reducedMotion,
        toggleFontMode,
        toggleLargeText,
        toggleHighContrast,
        toggleReducedMotion,
      }}
    >
      <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>
        {children}
      </MotionConfig>
    </AccessibilityContext.Provider>
  );
}
