import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import Student from "../models/Student";
import LearningProfile from "../models/LearningProfile";
import { signToken } from "../utils/jwt";
import { seedPoolForNewStudent, refillPool } from "../services/gamePoolService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Derive baseline difficulty (1–3) from age */
const baselineDifficulty = (age: number): number => {
  if (age <= 6) return 1;
  if (age <= 10) return 2;
  return 3;
};

/** Derive baseline score from readingLevel string */
const baselineScore = (readingLevel: string): number => {
  const map: Record<string, number> = {
    beginner: 20,
    emerging: 40,
    developing: 60,
    fluent: 80,
  };
  return map[readingLevel] ?? 30;
};

// ─── Student Register ──────────────────────────────────────────────────────────

export const registerStudent = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      name, age, grade, parentEmail, password,
      preferredLanguage, favoriteCharacter, favoriteTheme,
      learningInterests, readingLevel, avatarId,
    } = req.body;

    if (!name || !age || !parentEmail || !password) {
      res.status(400).json({ success: false, message: "name, age, parentEmail and password are required" });
      return;
    }

    // Check duplicate (same name + parentEmail)
    const exists = await Student.findOne({ name, parentEmail });
    if (exists) {
      res.status(409).json({ success: false, message: "Student already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const student = await Student.create({
      name, age, grade, parentEmail,
      passwordHash,
      preferredLanguage: preferredLanguage || "English",
      favoriteCharacter, favoriteTheme,
      learningInterests: learningInterests || [],
      readingLevel: readingLevel || "beginner",
      avatarId: avatarId || "explorer",
    });

    // Auto-create learning profile seeded from age + readingLevel
    const diff  = baselineDifficulty(age);
    const score = baselineScore(readingLevel || "beginner");

    // Use findOneAndUpdate+upsert so a duplicate profile never throws —
    // safe even if a previous registration attempt partially succeeded.
    await LearningProfile.findOneAndUpdate(
      { studentId: student._id },
      {
        $setOnInsert: {
          studentId:  student._id,
          readingScore: score,
          speechScore:  score,
          memoryScore:  score,
          writingScore: score,
          phonicsScore: score,
          attentionScore: score,
          currentDifficulty: {
            reading: diff, speech: diff, memory: diff, writing: diff, phonics: diff,
          },
        },
      },
      { upsert: true, new: true }
    );
    // Seed game pool in background — generates 10 AI games per game type
    seedPoolForNewStudent(String(student._id));
    const token = signToken({ id: String(student._id), role: "student", name: student.name });

    res.status(201).json({
      success: true,
      token,
      student: {
        id: student._id,
        name: student.name,
        age: student.age,
        avatarId: student.avatarId,
        xp: student.xp,
        coins: student.coins,
        level: student.level,
        streak: student.streak,
        readingLevel: student.readingLevel,
      },
    });
  } catch (err) {
    console.error("[Register] Student registration failed:", err instanceof Error ? err.message : err);
    const message = err instanceof Error ? err.message : "Registration failed";
    res.status(500).json({ success: false, message });
  }
};

// ─── Login ────────────────────────────────────────────────────────────────────

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, parentEmail, password } = req.body;

    if (!name || !parentEmail || !password) {
      res.status(400).json({ success: false, message: "name, parentEmail and password are required" });
      return;
    }

    // Student login — identified by name + parentEmail
    const student = await Student.findOne({ name, parentEmail });
    if (!student || !(await bcrypt.compare(password, student.passwordHash))) {
      res.status(401).json({ success: false, message: "Invalid credentials" });
      return;
    }

    // Update streak
    const today = new Date().toDateString();
    const lastActive = student.lastActiveDate ? new Date(student.lastActiveDate).toDateString() : null;
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    let streak = student.streak;
    if (lastActive !== today) {
      streak = lastActive === yesterday ? streak + 1 : 1;
      await Student.findByIdAndUpdate(student._id, { lastActiveDate: new Date(), streak });
    }

    const token = signToken({ id: String(student._id), role: "student", name: student.name });

    // Top up all 3 game pools in the background on every login so games are
    // always ready when the student opens a game page.
    const sid = String(student._id);
    Promise.allSettled([
      refillPool(sid, "phonics_adventure"),
      refillPool(sid, "word_quest"),
      refillPool(sid, "memory_challenge"),
    ]).catch(() => { /* silent — login must not fail because of pool fill */ });

    res.json({
      success: true,
      token,
      student: {
        id: student._id, name: student.name, age: student.age,
        avatarId: student.avatarId, xp: student.xp, coins: student.coins,
        level: student.level, streak, readingLevel: student.readingLevel,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed";
    res.status(500).json({ success: false, message });
  }
};

// ─── Get Me ───────────────────────────────────────────────────────────────────

export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ success: false, message: "Unauthorized" }); return; }

    const student = await Student.findById(req.user.id).select("-passwordHash");
    if (!student) { res.status(404).json({ success: false, message: "Student not found" }); return; }

    const profile = await LearningProfile.findOne({ studentId: student._id });
    res.json({ success: true, user: student, profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error fetching user";
    res.status(500).json({ success: false, message });
  }
};

// ─── Initial Assessment ────────────────────────────────────────────────────────

/**
 * POST /api/auth/assessment/:studentId
 * Body: { phonicsScore, readingScore, memoryScore } — all 0-100
 * Updates the learning profile with the first real scores.
 */
export const submitAssessment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId } = req.params;

    // S5 — IDOR guard: a student can only submit their own assessment
    if (req.user?.id !== studentId) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    const { phonicsScore, readingScore, memoryScore } = req.body;

    const profile = await LearningProfile.findOneAndUpdate(
      { studentId },
      {
        $set: {
          ...(phonicsScore !== undefined && { phonicsScore }),
          ...(readingScore !== undefined && { readingScore }),
          ...(memoryScore !== undefined && { memoryScore }),
        },
      },
      { new: true }
    );

    if (!profile) { res.status(404).json({ success: false, message: "Profile not found" }); return; }

    res.json({ success: true, profile });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Assessment update failed";
    res.status(500).json({ success: false, message });
  }
};
