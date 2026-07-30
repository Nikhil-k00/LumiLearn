"use client";
/**
 * usePoolGame
 *
 * Three-phase strategy:
 *
 *   Phase 1 — First page load / return visit (peek):
 *     • Calls GET /api/games/pool/:gameType/peek  ← reads WITHOUT consuming.
 *     • Shows whatever is the current unconsumed item in the pool.
 *
 *   Phase 2 — Section completed (consumeAndPreload):
 *     • Called immediately when the student finishes all 3 mini-games.
 *     • Calls GET /api/games/pool/:gameType  ← consumes current item, loads next.
 *     • Next time student opens this section, peek returns the NEW item.
 *     • Play Again also uses this already-loaded next item instantly.
 *
 *   Phase 3 — Play Again (peek):
 *     • Just peeks — the next item was already consumed+loaded in Phase 2.
 *     • No extra pop needed — student gets the preloaded content immediately.
 */

import { useState, useRef, useCallback } from "react";
import api from "@/lib/api";

const POLL_INTERVAL = 3000; // ms between retries when pool is empty
const MAX_POLLS     = 20;   // give up after 60s (20 × 3s)
/** Max ms to wait for a peek before falling back to static — keeps UI snappy */
const PEEK_TIMEOUT  = 4000;

type GameType = "phonics_adventure" | "word_quest" | "memory_challenge";

interface UsePoolGameResult<T> {
  /** AI-generated level content, or null if pool was empty / not yet fetched */
  dynamicLevel:    T | null;
  /** True while a fetch is still in-flight */
  peekLoading:     boolean;
  /** True when it's safe to show "Play Again" — always true on first play */
  nextLevelReady:  boolean;
  /** Call on mount (showSpinner=false) to silently load AI content over static.
   *  Call after Play Again (showSpinner=true) to gate render until new content loads. */
  peekPool:        (showSpinner?: boolean) => void;
  /** Call when all 3 mini-games complete — consumes current item, preloads next */
  consumeAndPreload: () => void;
  /** Clear the current AI level so Play Again mounts with fresh content */
  clearLevel:      () => void;
}

export function usePoolGame<T>(gameType: GameType, userId?: string): UsePoolGameResult<T> {
  const [dynamicLevel,   setDynamicLevel]   = useState<T | null>(null);
  const [peekLoading,    setPeekLoading]    = useState(false);
  const [nextLevelReady, setNextLevelReady] = useState(true);

  const pollCount  = useRef(0);
  const pollTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peekTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (pollTimer.current) { clearTimeout(pollTimer.current); pollTimer.current = null; }
    if (peekTimer.current) { clearTimeout(peekTimer.current); peekTimer.current = null; }
    pollCount.current = 0;
  };

  // ── Phase 1: PEEK on mount — silent, never blocks static content ───────────
  // Static offline content starts immediately. AI content silently replaces it
  // when the peek responds. Pass showSpinner=true only after Play Again when
  // dynamicLevel was explicitly cleared and we want to gate the mini-game mount.
  const peekPool = useCallback((showSpinner = false) => {
    stopPolling();
    if (!userId) { setNextLevelReady(true); return; }

    if (showSpinner) setPeekLoading(true);
    setNextLevelReady(true);

    peekTimer.current = setTimeout(() => { setPeekLoading(false); }, PEEK_TIMEOUT);

    api.get(`/api/games/pool/${gameType}/peek`)
      .then((res) => {
        clearTimeout(peekTimer.current!);
        peekTimer.current = null;
        if (res.data?.success && res.data.game?.content) {
          setDynamicLevel(res.data.game.content as T);
        }
      })
      .catch(() => { /* silent — static fallback continues */ })
      .finally(() => { setPeekLoading(false); });
  }, [gameType, userId]);

  // ── Phase 2: CONSUME + PRELOAD — called at section completion ──────────────
  // Consumes the current pool item (so next visit shows a new game) and
  // preloads the next item into state so Play Again is instant.
  const consumeAndPreload = useCallback(() => {
    stopPolling();
    if (!userId) return;

    setNextLevelReady(false);

    const attempt = () => {
      api.get(`/api/games/pool/${gameType}`)
        .then((res) => {
          if (res.data?.success && res.data.game?.content) {
            setDynamicLevel(res.data.game.content as T);
            setNextLevelReady(true);
          } else {
            // Pool still refilling — poll until ready
            pollCount.current += 1;
            if (pollCount.current >= MAX_POLLS) {
              setNextLevelReady(true); // timed out — Play Again will use static fallback
            } else {
              pollTimer.current = setTimeout(attempt, POLL_INTERVAL);
            }
          }
        })
        .catch(() => { setNextLevelReady(true); });
    };

    attempt();
  }, [gameType, userId]);

  const clearLevel = useCallback(() => {
    setDynamicLevel(null);
    setPeekLoading(false);
  }, []);

  return { dynamicLevel, peekLoading, nextLevelReady, peekPool, consumeAndPreload, clearLevel };
}
