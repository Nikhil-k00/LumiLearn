import { Request, Response } from "express";
import GameSession from "../models/GameSession";
import LearningProfile from "../models/LearningProfile";
import Student from "../models/Student";
import Achievement from "../models/Achievement";
import AnalyticsEntry from "../models/AnalyticsEntry";
import { calculateXP, getLevelFromXP } from "../utils/gamification";
import { popNextGame, peekNextGame, refillPoolWithContext, unconsumedCount, POOL_TARGET } from "../services/gamePoolService";
import aiService from "../services/aiService";

// ─── Badge catalogue ──────────────────────────────────────────────────────────
// Each badge fires at most once per student (idempotent upsert guard below).

interface BadgeDef {
  badgeId:     string;
  name:        string;
  emoji:       string;
  description: string;
}

const BADGES: BadgeDef[] = [
  { badgeId: "first_game",         name: "First Step!",       emoji: "🌟", description: "Completed your very first game!" },
  { badgeId: "phonics_starter",    name: "Phonics Star",      emoji: "🔤", description: "Completed your first Phonics Adventure!" },
  { badgeId: "word_quest_starter", name: "Word Explorer",     emoji: "📖", description: "Completed your first Word Quest!" },
  { badgeId: "memory_starter",     name: "Memory Spark",      emoji: "🧠", description: "Completed your first Memory Challenge!" },
  { badgeId: "perfect_phonics",    name: "Perfect Phonics",   emoji: "💎", description: "Scored 95%+ accuracy in Phonics Adventure!" },
  { badgeId: "perfect_reading",    name: "Reading Master",    emoji: "🏆", description: "Scored 95%+ accuracy in Word Quest!" },
  { badgeId: "perfect_memory",     name: "Memory Master",     emoji: "🎯", description: "Scored 95%+ accuracy in Memory Challenge!" },
  { badgeId: "streak_3",           name: "3-Day Streak!",     emoji: "🔥", description: "Played 3 days in a row!" },
  { badgeId: "streak_7",           name: "Week Warrior",      emoji: "🌈", description: "Played 7 days in a row!" },
  { badgeId: "level_5",            name: "Rising Star",       emoji: "⭐", description: "Reached Level 5!" },
  { badgeId: "level_10",           name: "Champion",          emoji: "👑", description: "Reached Level 10!" },
  { badgeId: "coins_100",          name: "Coin Collector",    emoji: "🪙", description: "Collected 100 coins!" },
  { badgeId: "xp_500",             name: "XP Hunter",         emoji: "⚡", description: "Earned 500 total XP!" },
];

const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.badgeId, b]));

/**
 * Check which badges the student has just unlocked and create them.
 * Uses findOneAndUpdate with upsert=false + create only if not exists —
 * each badge fires at most once per student lifetime.
 * Returns the list of newly awarded badges (so the response can show them).
 */
async function awardAchievements(
  studentId:    string,
  gameType:     string,
  accuracy:     number,
  totalSessions: number,   // all-time sessions INCLUDING this one
  newLevel:     number,
  newCoins:     number,
  newXP:        number,
  streak:       number,
): Promise<BadgeDef[]> {
  // Determine which badgeIds are earned this session
  const earned: string[] = [];

  // First-ever game
  if (totalSessions === 1) earned.push("first_game");

  // First game per type — totalSessions is the count for the specific gameType below,
  // so we pass per-type counts from the caller. Here we use the "already has badge"
  // guard below as the idempotency mechanism: always push, let the duplicate-check filter.
  if (gameType === "phonics_adventure") earned.push("phonics_starter");
  if (gameType === "word_quest")        earned.push("word_quest_starter");
  if (gameType === "memory_challenge")  earned.push("memory_starter");

  // Perfect accuracy
  if (accuracy >= 95 && gameType === "phonics_adventure") earned.push("perfect_phonics");
  if (accuracy >= 95 && gameType === "word_quest")        earned.push("perfect_reading");
  if (accuracy >= 95 && gameType === "memory_challenge")  earned.push("perfect_memory");

  // Streak milestones
  if (streak >= 3)  earned.push("streak_3");
  if (streak >= 7)  earned.push("streak_7");

  // Level milestones
  if (newLevel >= 5)  earned.push("level_5");
  if (newLevel >= 10) earned.push("level_10");

  // Cumulative milestones
  if (newCoins >= 100) earned.push("coins_100");
  if (newXP    >= 500) earned.push("xp_500");

  if (earned.length === 0) return [];

  // Fetch badges already owned so we don't double-award
  const existing = await Achievement.find(
    { studentId, badgeId: { $in: earned } },
    { badgeId: 1 }
  ).lean();
  const alreadyHas = new Set(existing.map((a) => a.badgeId));

  const newBadges = earned.filter((id) => !alreadyHas.has(id));
  if (newBadges.length === 0) return [];

  // Create all new badges in one shot
  const docs = newBadges.map((id) => ({
    studentId,
    badgeId:     id,
    name:        BADGE_MAP[id].name,
    emoji:       BADGE_MAP[id].emoji,
    description: BADGE_MAP[id].description,
    earnedAt:    new Date(),
  }));

  await Achievement.insertMany(docs);
  return newBadges.map((id) => BADGE_MAP[id]);
}

// POST /api/games/session
// Saves the completed session, updates scores locally, awards XP, then
// triggers a background pool refill using the real session data so the next
// AI-generated game is calibrated to the student's actual performance.
export const submitGameSession = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      gameType, score, accuracy, duration,
      attempts, mistakeLog, confusionMatrix,
      ttsUsageCount, maxSequenceRecalled, sequenceAccuracy, rhymeScore,
    } = req.body;

    // S1 — Always use the authenticated user's own ID from the JWT.
    // Never trust the body studentId — doing so would allow any authenticated
    // student to submit sessions as another student (IDOR).
    const resolvedStudentId = req.user?.id;

    if (!resolvedStudentId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return;
    }

    // S2 — Validate gameType up-front so unknown values are rejected rather than
    // silently skipping score updates and AI calls.
    const VALID_GAME_TYPES = ["phonics_adventure", "word_quest", "memory_challenge"] as const;
    if (!VALID_GAME_TYPES.includes(gameType as typeof VALID_GAME_TYPES[number])) {
      res.status(400).json({ success: false, message: `Invalid gameType: ${gameType}` });
      return;
    }

    // 1. Fetch current learner state
    const [student, profile] = await Promise.all([
      Student.findById(resolvedStudentId),
      LearningProfile.findOne({ studentId: resolvedStudentId }),
    ]);

    if (!student || !profile) {
      res.status(404).json({ success: false, message: "Student or profile not found" });
      return;
    }

    // 2. Save game session
    const domainMap: Record<string, string> = {
      phonics_adventure: "phonics",
      word_quest:        "reading",
      memory_challenge:  "memory",
    };
    const domain = domainMap[gameType as string] ?? "";
    const diffObj = profile.currentDifficulty as unknown as Record<string, number>;
    const currentDiff = (domain ? diffObj[domain] : 1) || 1;

    const xpEarned = calculateXP(accuracy, currentDiff, attempts ?? 1);
    const session = await GameSession.create({
      studentId: resolvedStudentId, gameType, score, xpEarned, accuracy, duration,
      mistakeLog: mistakeLog ?? [],
      confusionMatrix: confusionMatrix ?? {},
      completedAt: new Date(),
    });

    // 3. Update learning profile scores using 70/30 weighted average.
    //    The pool refill (below) will call the AI with real session data —
    //    AI-computed score updates will be applied when that result arrives.
    const safeAccuracy = typeof accuracy === "number" ? accuracy : 0;
    const scoreUpdates: Record<string, unknown> = {};

    if (gameType === "phonics_adventure") {
      scoreUpdates.phonicsScore = Math.min(100,
        Math.round(((profile.phonicsScore ?? 0) * 0.7) + (safeAccuracy * 0.3))
      );
    }
    if (gameType === "word_quest") {
      scoreUpdates.readingScore = Math.min(100,
        Math.round(((profile.readingScore ?? 0) * 0.7) + (safeAccuracy * 0.3))
      );
    }
    if (gameType === "memory_challenge") {
      scoreUpdates.memoryScore = Math.min(100,
        Math.round(((profile.memoryScore ?? 0) * 0.7) + (safeAccuracy * 0.3))
      );
    }

    // Gentle difficulty adjustment based on accuracy alone (no AI gate needed)
    if (domain) {
      const streak = (profile.goodSessionStreak as unknown as Record<string, number>) ?? {};
      const curDiff = (profile.currentDifficulty as unknown as Record<string, number>)[domain] ?? 1;

      if (safeAccuracy >= 85) {
        // Good session — advance difficulty only after 2 consecutive good sessions
        if ((streak[domain] ?? 0) >= 1) {
          const newDiff = { ...(profile.currentDifficulty as unknown as Record<string, number>) };
          newDiff[domain] = Math.min(5, curDiff + 1);
          scoreUpdates.currentDifficulty = { ...profile.currentDifficulty, ...newDiff };
          scoreUpdates.goodSessionStreak = { ...streak, [domain]: 0 };
        } else {
          scoreUpdates.goodSessionStreak = { ...streak, [domain]: (streak[domain] ?? 0) + 1 };
        }
      } else if (safeAccuracy < 50) {
        // Struggling — drop difficulty immediately
        const newDiff = { ...(profile.currentDifficulty as unknown as Record<string, number>) };
        newDiff[domain] = Math.max(1, curDiff - 1);
        scoreUpdates.currentDifficulty = { ...profile.currentDifficulty, ...newDiff };
        scoreUpdates.goodSessionStreak = { ...streak, [domain]: 0 };
      } else {
        // Neutral — reset streak
        scoreUpdates.goodSessionStreak = { ...streak, [domain]: 0 };
      }
    }

    // Derive weak/strong areas from the latest scores so the recommendation
    // agent always has up-to-date context. A domain is weak if score < 50,
    // strong if score > 70.
    const latestScores: Record<string, number> = {
      phonics:  (scoreUpdates.phonicsScore  as number) ?? profile.phonicsScore,
      reading:  (scoreUpdates.readingScore  as number) ?? profile.readingScore,
      memory:   (scoreUpdates.memoryScore   as number) ?? profile.memoryScore,
      writing:  profile.writingScore,
      speech:   profile.speechScore,
    };
    scoreUpdates.weakAreas   = Object.entries(latestScores).filter(([, v]) => v < 50).map(([k]) => k);
    scoreUpdates.strongAreas = Object.entries(latestScores).filter(([, v]) => v > 70).map(([k]) => k);

    if (Object.keys(scoreUpdates).length > 0) {
      await LearningProfile.findOneAndUpdate({ studentId: resolvedStudentId }, { $set: scoreUpdates });
    }

    // 4. Award XP + coins + level
    const newXP     = student.xp + xpEarned;
    const newLevel  = getLevelFromXP(newXP);
    const leveledUp = newLevel > student.level;
    const newCoins  = student.coins + Math.round(xpEarned / 5);

    await Student.findByIdAndUpdate(resolvedStudentId, {
      xp: newXP, level: newLevel, coins: newCoins, lastActiveDate: new Date(),
    });

    // 5. Upsert daily analytics
    const today = new Date().toISOString().split("T")[0];
    const derivedScore =
      gameType === "phonics_adventure" ? (scoreUpdates.phonicsScore as number ?? profile.phonicsScore)
      : gameType === "word_quest"      ? (scoreUpdates.readingScore  as number ?? profile.readingScore)
      : gameType === "memory_challenge"? (scoreUpdates.memoryScore   as number ?? profile.memoryScore)
      : profile.phonicsScore;

    await AnalyticsEntry.findOneAndUpdate(
      { studentId: resolvedStudentId, date: today },
      {
        $inc: { sessionTime: duration, totalGamesPlayed: 1, xpEarned: xpEarned },
        $set: {
          ...(gameType === "phonics_adventure" && { phonicsScore: derivedScore }),
          ...(gameType === "word_quest"        && { readingAccuracy: accuracy }),
          ...(gameType === "memory_challenge"  && { memoryScore: derivedScore }),
        },
      },
      { upsert: true }
    );

    // 6. Check & award achievements (runs fast — pure DB reads + inserts)
    const totalSessions = await GameSession.countDocuments({ studentId: resolvedStudentId });
    const newBadges = await awardAchievements(
      resolvedStudentId,
      gameType as string,
      safeAccuracy,
      totalSessions,
      newLevel,
      newCoins,
      newXP,
      student.streak,
    ).catch(() => [] as BadgeDef[]);  // never let badge errors break the response

    // 7. Call AI service for the encouragement message (GPT-4o-mini — fast, cheap).
    //    Capped at 12 s so the response never hangs. Falls back to a static string.
    const gameResultPayload = {
      score, accuracy, duration,
      attempts:            attempts ?? 1,
      mistakeLog:          mistakeLog ?? [],
      confusionMatrix:     confusionMatrix ?? {},
      sequenceAccuracy:    sequenceAccuracy ?? undefined,
      rhymeScore:          rhymeScore ?? undefined,
      maxSequenceRecalled: maxSequenceRecalled ?? undefined,
      ttsUsageCount:       ttsUsageCount ?? undefined,
    };

    let encouragementMessage = "Keep it up — you're doing great!";
    try {
      const updatedProfile = await LearningProfile.findOne({ studentId: resolvedStudentId });
      if (updatedProfile) {
        const aiResp = await Promise.race([
          aiService.orchestrate({
            learnerState: {
              studentId: resolvedStudentId,
              name:      student.name,
              age:       student.age,
              favoriteCharacter: student.favoriteCharacter,
              favoriteTheme:     student.favoriteTheme,
              readingScore:  updatedProfile.readingScore,
              speechScore:   updatedProfile.speechScore,
              memoryScore:   updatedProfile.memoryScore,
              writingScore:  updatedProfile.writingScore,
              phonicsScore:  updatedProfile.phonicsScore,
              weakAreas:     updatedProfile.weakAreas ?? [],
              strongAreas:   updatedProfile.strongAreas ?? [],
              currentDifficulty: updatedProfile.currentDifficulty,
            },
            gameResult: { gameType, ...gameResultPayload },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("AI timeout")), 12000)
          ),
        ]);
        if (aiResp.encouragementMessage) {
          encouragementMessage = aiResp.encouragementMessage;
        }
      }
    } catch {
      // AI call timed out or failed — use static fallback, don't break session response
    }

    // 8. Trigger background pool refill for the played game type using real
    //    session data. The pool refill calls the AI with this data so newly
    //    generated games are matched to the student's actual progress.
    //    The lock in refillPool ensures this only runs if pool is below target.
    refillPoolWithContext(
      resolvedStudentId,
      gameType as "phonics_adventure" | "word_quest" | "memory_challenge",
      gameResultPayload
    ).catch((err) => console.error("[GamePool] Refill after session failed:", err));

    res.json({
      success:              true,
      sessionId:            session._id,
      xpAwarded:            xpEarned,
      coinsAwarded:         newCoins - student.coins,
      leveledUp,
      newLevel,
      newXP,
      newBadges,            // array of { badgeId, name, emoji, description } — empty if none
      encouragementMessage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error saving session";
    res.status(500).json({ success: false, message });
  }
};

// GET /api/games/pool/:gameType
// Pops the next pre-generated AI game from the student's pool instantly.
// If pool drops below LOW_WATER_MARK after popping, a background refill fires.
export const getPoolGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;
    const { gameType } = req.params;

    if (!studentId) {
      res.status(400).json({ success: false, message: "Student ID required" });
      return;
    }

    const validTypes = ["phonics_adventure", "word_quest", "memory_challenge"];
    if (!validTypes.includes(gameType)) {
      res.status(400).json({ success: false, message: "Invalid gameType" });
      return;
    }

    const game = await popNextGame(
      studentId,
      gameType as "phonics_adventure" | "word_quest" | "memory_challenge"
    );

    res.json({ success: true, game });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching pool game";
    res.status(500).json({ success: false, message });
  }
};

// GET /api/games/pool/:gameType/count — how many games are ready in the pool
export const getPoolCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;
    const { gameType } = req.params;
    if (!studentId) { res.status(400).json({ success: false, message: "Student ID required" }); return; }

    const count = await unconsumedCount(
      studentId,
      gameType as "phonics_adventure" | "word_quest" | "memory_challenge"
    );

    res.json({ success: true, count, target: POOL_TARGET });
  } catch (err) {
    res.status(500).json({ success: false, message: "Error fetching pool count" });
  }
};

// GET /api/games/pool/:gameType/peek
// Returns the next AI game WITHOUT consuming it — used on first page load so
// students always see fresh AI content, but the pool slot is not wasted until
// they actually complete a session and click "Play Again".
export const peekPoolGame = async (req: Request, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.id;
    const { gameType } = req.params;

    if (!studentId) {
      res.status(400).json({ success: false, message: "Student ID required" });
      return;
    }

    const validTypes = ["phonics_adventure", "word_quest", "memory_challenge"];
    if (!validTypes.includes(gameType)) {
      res.status(400).json({ success: false, message: "Invalid gameType" });
      return;
    }

    const game = await peekNextGame(
      studentId,
      gameType as "phonics_adventure" | "word_quest" | "memory_challenge"
    );

    res.json({ success: true, game });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error peeking pool game";
    res.status(500).json({ success: false, message });
  }
};
