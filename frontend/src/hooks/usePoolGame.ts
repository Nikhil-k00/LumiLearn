"use client";
/**
 * usePoolGame
 *
 * Two-phase strategy — ensures students always see DIFFERENT questions:
 *
 *   Phase 1 — First page load (including every login / return visit):
 *     • Calls GET /api/games/pool/:gameType/peek  ← reads WITHOUT consuming.
 *     • The pool slot is NOT used up — the same fresh item will be available
 *       next time the student logs in and opens this game.
 *     • Shows a brief spinner while peek is in-flight (max 4s), then static fallback.
 *
 *   Phase 2 — After a session is submitted ("Play Again"):
 *     • Calls GET /api/games/pool/:gameType  ← reads AND consumes.
 *     • Marks the item as consumed so it is never served again.
 *     • Triggers background refill so the next "Play Again" is also ready.
 *     • Polls every POLL_INTERVAL ms if pool is empty, auto-enables button.
 *
 * This guarantees:
 *   - Opening a game never wastes a pool slot.
 *   - Repeated logins show the same next-up AI game (not a new one each time).
 *   - "Play Again" always delivers a genuinely new game the student hasn't seen.
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
  dynamicLevel:   T | null;
  /** True while the initial peek request is still in-flight */
  peekLoading:    boolean;
  /** True when it's safe to show "Play Again" — always true on first play */
  nextLevelReady: boolean;
  /**
   * Call on mount (isFirstLoad=true) to peek without consuming.
   * Call after session submit (isFirstLoad=false) to pop and consume.
   */
  fetchFromPool:  (isFirstLoad?: boolean) => void;
  /** Clear the current AI level (call when restarting so stale content is dropped) */
  clearLevel:     () => void;
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

  const fetchFromPool = useCallback((isFirstLoad = false) => {
    stopPolling();

    if (!userId) {
      setNextLevelReady(true);
      return;
    }

    if (isFirstLoad) {
      // ── Phase 1: PEEK (no consume) ─────────────────────────────────────────
      // Gate game rendering briefly while the peek is in-flight so the mini-game
      // always initialises with AI data, not static fallback data.
      // If peek takes > PEEK_TIMEOUT ms, fall through to static content.
      setPeekLoading(true);
      setNextLevelReady(true);

      // Safety timeout — never block the game longer than PEEK_TIMEOUT
      peekTimer.current = setTimeout(() => {
        setPeekLoading(false);
      }, PEEK_TIMEOUT);

      api.get(`/api/games/pool/${gameType}/peek`)
        .then((res) => {
          clearTimeout(peekTimer.current!);
          peekTimer.current = null;
          if (res.data?.success && res.data.game?.content) {
            setDynamicLevel(res.data.game.content as T);
          }
        })
        .catch(() => { /* silent — static content will show */ })
        .finally(() => { setPeekLoading(false); });
      return;
    }

    // ── Phase 2: POP (consume) — "Play Again" ──────────────────────────────
    // Student completed a session. Pop the next item (marks it consumed so
    // it is never repeated). Gate mini-game rendering until content arrives
    // so mini-games never mount with stale static data.
    setNextLevelReady(false);
    setPeekLoading(true);   // gate mini-game mount while we wait for pop

    const attempt = () => {
      api.get(`/api/games/pool/${gameType}`)
        .then((res) => {
          if (res.data?.success && res.data.game?.content) {
            setDynamicLevel(res.data.game.content as T);
            setPeekLoading(false);
            setNextLevelReady(true);
          } else {
            // Pool refilling — keep polling
            pollCount.current += 1;
            if (pollCount.current >= MAX_POLLS) {
              setPeekLoading(false);   // timed out — fall back to static
              setNextLevelReady(true);
            } else {
              pollTimer.current = setTimeout(attempt, POLL_INTERVAL);
            }
          }
        })
        .catch(() => {
          setPeekLoading(false);
          setNextLevelReady(true);   // network error — unblock
        });
    };

    attempt();
  }, [gameType, userId]);

  const clearLevel = useCallback(() => {
    setDynamicLevel(null);
    setPeekLoading(false);
  }, []);

  return { dynamicLevel, peekLoading, nextLevelReady, fetchFromPool, clearLevel };
}
