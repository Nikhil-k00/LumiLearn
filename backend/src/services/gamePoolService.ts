import GamePool from "../models/GamePool";
import LearningProfile from "../models/LearningProfile";
import Student from "../models/Student";
import aiService from "./aiService";

/** Exact number of ready games to maintain per student per game type */
export const POOL_TARGET    = 10;
/**
 * Refill threshold: trigger a background top-up when the pool drops below
 * this number AFTER a game is played.  Set to POOL_TARGET - 1 so a refill
 * fires after every single play — this keeps the pool always full at 10.
 */
export const LOW_WATER_MARK = POOL_TARGET - 1;
/** Max items to generate per refill call — never exceed POOL_TARGET */
const BATCH_SIZE = POOL_TARGET;
/** Max parallel AI calls per refill — keeps the AI service from being hammered */
const MAX_CONCURRENT = 3;
/** Maximum additional generation rounds when AI output is invalid or incomplete */
export const MAX_REFILL_RETRIES = 2;

/**
 * In-memory lock: tracks which "studentId:gameType" refills are currently running.
 * Any concurrent call for the same key returns immediately — prevents the race
 * condition where 3 simultaneous callers all read count=0 and each generate 10 items.
 */
const refillLocks = new Set<string>();

const GAME_TYPES = ["phonics_adventure", "word_quest", "memory_challenge"] as const;
type GameType = typeof GAME_TYPES[number];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalizeForDuplicateCheck(value: unknown): string {
  if (typeof value === "string") return value.trim().replace(/\s+/g, " ");
  if (typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (value === null || value === undefined) return "null";
  if (Array.isArray(value)) return JSON.stringify(value.map(canonicalizeForDuplicateCheck));
  if (isPlainObject(value)) {
    return JSON.stringify(
      Object.fromEntries(
        Object.entries(value)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([key, entry]) => [key, canonicalizeForDuplicateCheck(entry)])
      )
    );
  }
  return JSON.stringify(String(value));
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

export function validateGeneratedActivity(
  activity: unknown,
  gameType: GameType,
  seenTitles = new Set<string>(),
  seenContent = new Set<string>()
): activity is { gameType: GameType; title: string; difficulty: number; content: Record<string, unknown> } {
  if (!isPlainObject(activity)) return false;

  const { gameType: generatedGameType, title, difficulty, content } = activity as Record<string, unknown>;
  if (generatedGameType !== gameType || typeof generatedGameType !== "string") return false;
  if (typeof title !== "string" || title.trim().length === 0) return false;
  if (!Number.isInteger(difficulty) || typeof difficulty !== "number" || difficulty < 1 || difficulty > 5) return false;
  if (!isPlainObject(content) || Object.keys(content).length === 0) return false;

  const normalizedTitle = normalizeTitle(title);
  const normalizedContent = canonicalizeForDuplicateCheck(content);
  if (seenTitles.has(normalizedTitle) || seenContent.has(normalizedContent)) return false;

  seenTitles.add(normalizedTitle);
  seenContent.add(normalizedContent);
  return true;
}

// ─── Count ready (unplayed) items ─────────────────────────────────────────────
// Items are DELETED when played, so the array length equals the ready count.

export async function unconsumedCount(studentId: string, gameType: GameType): Promise<number> {
  const pool = await GamePool.findOne({ studentId, gameType }).select("items").lean();
  if (!pool) return 0;
  return pool.items.length;
}

// ─── Peek the first ready item WITHOUT removing it ───────────────────────────
// Used on first page load — returns fresh AI content without consuming the slot.
// The item is only removed when the student actually completes a session.

export async function peekNextGame(
  studentId: string,
  gameType: GameType
): Promise<{ content: Record<string, unknown>; title: string; difficulty: number } | null> {
  const pool = await GamePool.findOne({ studentId, gameType }).lean();
  if (!pool || pool.items.length === 0) return null;
  const item = pool.items[0];
  return { content: item.content, title: item.title, difficulty: item.difficulty };
}

// ─── Pop the first ready item — DELETES it from the array ────────────────────
// Called when a student completes a session and clicks "Play Again".
// Removing the item keeps the array length equal to the number of unplayed games.

export async function popNextGame(
  studentId: string,
  gameType: GameType
): Promise<{ content: Record<string, unknown>; title: string; difficulty: number } | null> {
  const pool = await GamePool.findOne({ studentId, gameType });

  // No pool document yet — trigger an immediate fill and return null
  if (!pool) {
    refillPool(studentId, gameType).catch((err) =>
      console.error(`[GamePool] Initial fill failed for ${gameType}:`, err)
    );
    return null;
  }

  if (pool.items.length === 0) {
    // Pool empty — trigger a refill and return null
    refillPool(studentId, gameType).catch((err) =>
      console.error(`[GamePool] Refill-on-empty failed for ${gameType}:`, err)
    );
    return null;
  }

  // Take the first item and atomically remove it from the array in one operation.
  // Using findOneAndUpdate + $pop keeps this atomic — no separate save() needed.
  const item = pool.items[0];
  await GamePool.findOneAndUpdate(
    { studentId, gameType },
    { $pop: { items: -1 } }   // -1 removes from the front (FIFO)
  );

  // Array now has one fewer item — trigger a top-up to keep pool at POOL_TARGET
  const remaining = pool.items.length - 1;
  if (remaining < LOW_WATER_MARK) {
    refillPool(studentId, gameType).catch((err) =>
      console.error(`[GamePool] Background refill failed for ${gameType}:`, err)
    );
  }

  return { content: item.content, title: item.title, difficulty: item.difficulty };
}

// ─── Shared type for an optional real game result context ─────────────────────

interface GameResultContext {
  score:                number;
  accuracy:             number;
  duration:             number;
  attempts:             number;
  mistakeLog:           unknown[];
  confusionMatrix:      Record<string, unknown>;
  // memory-challenge extras
  sequenceAccuracy?:    number;
  rhymeScore?:          number;
  maxSequenceRecalled?: number;
  // word-quest extras
  ttsUsageCount?:       number;
}

// ─── Internal fill implementation ─────────────────────────────────────────────

async function doRefill(
  studentId: string,
  gameType:  GameType,
  gameResult: GameResultContext
): Promise<void> {
  const lockKey = `${studentId}:${gameType}`;

  // If a refill for this student+gameType is already in progress, skip — avoids
  // duplicate generation when login, session-end, and seed all fire concurrently.
  if (refillLocks.has(lockKey)) {
    console.log(`[GamePool] Refill already in progress for ${gameType} — skipping`);
    return;
  }
  refillLocks.add(lockKey);

  try {
    // Check how many are already unconsumed — don't overfill
    const existingPool = await GamePool.findOne({ studentId, gameType }).select("items").lean();
    const existingItems = existingPool?.items ?? [];
    const current = existingItems.length;
    const needed  = POOL_TARGET - current;
    if (needed <= 0) {
      console.log(`[GamePool] Pool full for ${gameType} (${current} items) — skipping refill`);
      return;
    }

    // Cap at BATCH_SIZE per call
    const toGenerate = Math.min(needed, BATCH_SIZE);
    console.log(`[GamePool] Refilling ${gameType}: need ${needed} items, generating ${toGenerate}`);

    // Fetch learner state once
    const [student, profile] = await Promise.all([
      Student.findById(studentId),
      LearningProfile.findOne({ studentId }),
    ]);
    if (!student || !profile) return;

    const learnerState = {
      studentId: String(student._id),
      name:      student.name,
      age:       student.age,
      favoriteCharacter: student.favoriteCharacter,
      favoriteTheme:     student.favoriteTheme,
      readingScore:  profile.readingScore,
      speechScore:   profile.speechScore,
      memoryScore:   profile.memoryScore,
      writingScore:  profile.writingScore,
      phonicsScore:  profile.phonicsScore,
      weakAreas:     profile.weakAreas,
      strongAreas:   profile.strongAreas,
      currentDifficulty: profile.currentDifficulty,
    };

    const newItems: Array<{ content: Record<string, unknown>; difficulty: number; title: string; generatedAt: Date; consumed: boolean }> = [];
    const seenTitles = new Set<string>();
    const seenContentHashes = new Set<string>();

    for (const item of existingItems) {
      if (typeof item.title === "string" && isPlainObject(item.content)) {
        seenTitles.add(normalizeTitle(item.title));
        seenContentHashes.add(canonicalizeForDuplicateCheck(item.content));
      }
    }

    for (let retry = 0; retry <= MAX_REFILL_RETRIES && newItems.length < needed; retry += 1) {
      const remaining = Math.min(needed - newItems.length, BATCH_SIZE);
      const results: PromiseSettledResult<Awaited<ReturnType<typeof aiService.orchestrate>>>[] = [];

      for (let i = 0; i < remaining; i += MAX_CONCURRENT) {
        const batch = Array.from({ length: Math.min(MAX_CONCURRENT, remaining - i) }, () =>
          aiService.orchestrate({
            learnerState,
            // Use the provided game result — real data from session, or neutral defaults for seeding
            gameResult: { gameType, ...gameResult },
          })
        );
        results.push(...await Promise.allSettled(batch));
      }

      for (const result of results) {
        if (newItems.length >= needed) break;
        if (result.status === "rejected") {
          console.error(`[GamePool] AI call failed for ${gameType}:`, result.reason instanceof Error ? result.reason.message : result.reason);
          continue;
        }

        const activities = Array.isArray(result.value?.activities) ? result.value.activities : [];
        for (const activity of activities) {
          if (!validateGeneratedActivity(activity, gameType, seenTitles, seenContentHashes)) {
            console.warn(`[GamePool] Skipping malformed or duplicate AI activity for ${gameType}`);
            continue;
          }

          newItems.push({
            content:     activity.content,
            difficulty:  activity.difficulty,
            title:       activity.title,
            generatedAt: new Date(),
            consumed:    false,
          });
          console.log(`[GamePool] Generated item ${newItems.length} for ${gameType}`);
          if (newItems.length >= needed) break;
        }
      }
    }

    if (newItems.length < needed) {
      console.warn(`[GamePool] Refill incomplete for ${gameType}: generated ${newItems.length} of ${needed} requested items after ${MAX_REFILL_RETRIES} retries`);
    }
    if (newItems.length === 0) return;

    // Append only the missing capacity so existing valid pool items are retained.
    await GamePool.findOneAndUpdate(
      { studentId, gameType },
      { $push: { items: { $each: newItems.slice(0, needed) } } },
      { upsert: true, new: true }
    );

    console.log(`[GamePool] Pool for ${gameType} now has ${await unconsumedCount(studentId, gameType)} ready items`);
  } finally {
    refillLocks.delete(lockKey);
  }
}

// ─── Public: refill with neutral data (login / seed) ─────────────────────────
// Used on login and initial seed — no real session data available yet.

export async function refillPool(studentId: string, gameType: GameType): Promise<void> {
  return doRefill(studentId, gameType, {
    score: 0, accuracy: 70, duration: 0, attempts: 1, mistakeLog: [], confusionMatrix: {},
  });
}

// ─── Public: refill with real session data (after gameplay) ───────────────────
// Called after a game session so the AI generates content calibrated to the
// student's actual just-completed performance — not dummy neutral values.

export async function refillPoolWithContext(
  studentId:  string,
  gameType:   GameType,
  gameResult: GameResultContext
): Promise<void> {
  return doRefill(studentId, gameType, gameResult);
}

// ─── Seed all 3 game types for a brand-new student ───────────────────────────
// Runs sequentially (one game type at a time) so registration responds instantly
// and the AI service is not hammered with 30 simultaneous calls.

export function seedPoolForNewStudent(studentId: string): void {
  console.log(`[GamePool] Seeding initial pool for student ${studentId}`);
  setImmediate(async () => {
    for (const gt of GAME_TYPES) {
      await refillPool(studentId, gt).catch((err) =>
        console.error(`[GamePool] Seed failed for ${gt}:`, err instanceof Error ? err.message : err)
      );
    }
    console.log(`[GamePool] Seeding complete for student ${studentId}`);
  });
}
