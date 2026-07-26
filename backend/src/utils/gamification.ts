export const LEVEL_THRESHOLDS = [
  0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700,
  3250, 3850, 4500, 5200, 5950, 6750, 7600, 8500, 9450, 10000,
];

/**
 * Calculate XP earned for a single game session.
 * @param accuracy   0–100 percentage of correct answers
 * @param difficulty 1–5 game difficulty level
 * @param attempts   total number of attempts made
 */
export const calculateXP = (
  accuracy: number,
  difficulty: number,
  attempts: number
): number => {
  const baseXP = difficulty * 20;
  const accuracyMultiplier = accuracy / 100;
  const effortBonus = Math.min(attempts * 2, 20); // rewards trying, capped at 20
  return Math.round(baseXP * accuracyMultiplier + effortBonus);
};

/**
 * Return the level (1-based) that corresponds to the given total XP.
 */
export const getLevelFromXP = (totalXP: number): number => {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
};

/**
 * Return the XP required to reach the next level, or the max threshold if already at cap.
 */
export const getXPForNextLevel = (currentLevel: number): number => {
  const nextIndex = currentLevel; // currentLevel is 1-based; threshold index for next level
  return nextIndex < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[nextIndex] : LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
};
