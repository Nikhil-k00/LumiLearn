import { Request, Response } from "express";
import Student from "../models/Student";
import LearningProfile from "../models/LearningProfile";
import Achievement from "../models/Achievement";

// GET /api/students/:id/dashboard
export const getStudentDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // S3 — IDOR guard: a student can only view their own dashboard; parents can view any
    if (req.user?.id !== id && req.user?.role !== "parent") {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    const student = await Student.findById(id).select("-passwordHash");
    if (!student) { res.status(404).json({ success: false, message: "Student not found" }); return; }

    const profile = await LearningProfile.findOne({ studentId: id });
    const achievements = await Achievement.find({ studentId: id }).sort({ earnedAt: -1 }).limit(5);

    res.json({ success: true, student, profile, recentAchievements: achievements });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    res.status(500).json({ success: false, message });
  }
};

// PUT /api/students/:id/profile
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Guard: student can only update their own profile
    if (req.user?.id !== id && req.user?.role !== "parent") {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    const allowed = ["favoriteCharacter", "favoriteTheme", "learningInterests", "avatarId", "preferredLanguage"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    const student = await Student.findByIdAndUpdate(id, updates, { new: true }).select("-passwordHash");
    if (!student) { res.status(404).json({ success: false, message: "Student not found" }); return; }

    res.json({ success: true, student });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    res.status(500).json({ success: false, message });
  }
};
