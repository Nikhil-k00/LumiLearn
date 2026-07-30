// ─── Enums ────────────────────────────────────────────────────────────────────

export enum GameType {
  PhonicsAdventure = "phonics_adventure",
  WordQuest = "word_quest",
  MemoryChallenge = "memory_challenge",
}

export enum UserRole {
  Student = "student",
}

export enum DifficultyLevel {
  VeryEasy = 1,
  Easy = 2,
  Medium = 3,
  Hard = 4,
  VeryHard = 5,
}

// ─── Core Entities ────────────────────────────────────────────────────────────

export interface Student {
  _id: string;
  name: string;
  age: number;
  grade: number;
  parentEmail: string;
  preferredLanguage: string;
  favoriteCharacter?: string;
  favoriteTheme?: string;
  learningInterests?: string[];
  readingLevel: "beginner" | "emerging" | "developing" | "fluent";
  avatarId: string; // emoji string e.g. "🚀"
  xp: number;
  coins: number;
  level: number;
  streak: number;
  lastActiveDate?: string; // ISO date string
  role: UserRole.Student;
  createdAt: string;
  updatedAt: string;
}

// ─── Learning Profile ─────────────────────────────────────────────────────────

export interface LearningProfile {
  _id: string;
  studentId: string;
  readingScore: number;    // 0–100
  speechScore: number;     // 0–100
  memoryScore: number;     // 0–100
  writingScore: number;    // 0–100
  phonicsScore: number;    // 0–100
  attentionScore: number;  // 0–100
  commonErrors: string[];
  weakAreas: string[];
  strongAreas: string[];
  currentMission?: string;
  currentDifficulty: {
    reading: DifficultyLevel;
    speech: DifficultyLevel;
    memory: DifficultyLevel;
    writing: DifficultyLevel;
    phonics: DifficultyLevel;
  };
  goodSessionStreak: {
    reading: number;
    memory: number;
    phonics: number;
  };
  updatedAt: string;
}

// ─── Game Session ─────────────────────────────────────────────────────────────

export interface MistakeLogEntry {
  item: string;
  studentAnswer: string;
  correct: string;
}

export interface GameSession {
  _id: string;
  studentId: string;
  gameType: GameType;
  score: number;
  xpEarned: number;
  accuracy: number; // 0–100 percentage
  duration: number; // seconds
  mistakeLog: MistakeLogEntry[];
  completedAt: string; // ISO datetime
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsEntry {
  _id: string;
  studentId: string;
  date: string; // YYYY-MM-DD
  readingAccuracy: number;
  pronunciationScore: number;
  memoryScore: number;
  writingScore: number;
  phonicsScore: number;
  sessionTime: number; // total seconds
  totalGamesPlayed: number;
  xpEarned: number;
}

// ─── Gamification ─────────────────────────────────────────────────────────────

export interface Achievement {
  _id: string;
  studentId: string;
  badgeId: string;
  name: string;
  description?: string;
  emoji?: string;
  earnedAt: string;
}

// ─── AI / Recommendations ─────────────────────────────────────────────────────

export interface Activity {
  id: string;
  title: string;
  description: string;
  gameType: GameType;
  targetArea: string;
  difficulty: DifficultyLevel;
  estimatedMinutes: number;
}

export interface Recommendation {
  _id: string;
  studentId: string;
  generatedAt: string;
  activities: Activity[];
  focusAreas: string[];
  difficultyAdjustments: Partial<LearningProfile["currentDifficulty"]>;
  gptResponseRaw?: string;
}
