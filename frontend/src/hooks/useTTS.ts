"use client";
import { useRef, useCallback, useEffect } from "react";

/**
 * Thin wrapper around browser Web Speech API (SpeechSynthesis).
 *
 * Key fixes:
 *  1. Voices load asynchronously — getVoices() returns [] on the very first call
 *     in Chrome/Edge. We cache the voice list once `onvoiceschanged` fires so
 *     every subsequent speak() uses a real English voice instead of the robotic default.
 *  2. The cached voice ref is populated immediately if voices are already available
 *     (Firefox / Safari return them synchronously).
 */
export function useTTS() {
  const utteranceRef  = useRef<SpeechSynthesisUtterance | null>(null);
  // Cache the preferred voice once loaded — avoids re-running getVoices() on every speak()
  const voiceRef      = useRef<SpeechSynthesisVoice | null>(null);

  // Resolve the best available English voice.
  // Priority: Google en-US  >  any en-US  >  any English
  const resolveVoice = useCallback((): SpeechSynthesisVoice | null => {
    if (typeof window === "undefined" || !window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices();
    return (
      voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en-US")) ??
      voices.find((v) => v.name.includes("Google") && v.lang.startsWith("en"))    ??
      voices.find((v) => v.lang === "en-US")                                       ??
      voices.find((v) => v.lang.startsWith("en-US"))                               ??
      voices.find((v) => v.lang.startsWith("en"))                                  ??
      null
    );
  }, []);

  // Populate voiceRef once — either immediately (Firefox/Safari) or after the
  // async onvoiceschanged event fires (Chrome/Edge).
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const tryLoad = () => {
      const v = resolveVoice();
      if (v) voiceRef.current = v;
    };

    tryLoad(); // synchronous attempt (works in Firefox/Safari)
    window.speechSynthesis.onvoiceschanged = tryLoad; // async load (Chrome/Edge)

    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, [resolveVoice]);

  const speak = useCallback((text: string, rate = 0.8, pitch = 1.0) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    // Strip hyphens used in audioHint notation like "b-e-d" → "bed"
    // so the engine pronounces the whole word, not individual letters.
    const cleanText = text.replace(/-/g, " ").trim();

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(cleanText);
    u.rate  = rate;
    u.pitch = pitch;
    u.lang  = "en-US";

    // Use cached voice; if not yet loaded, try resolving right now
    const voice = voiceRef.current ?? resolveVoice();
    if (voice) {
      u.voice       = voice;
      voiceRef.current = voice; // cache for next call
    }

    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  }, [resolveVoice]);

  const stop = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
  }, []);

  return { speak, stop };
}
