import { Request, Response } from "express";
import AnalyticsEntry from "../models/AnalyticsEntry";

// GET /api/students/:id/analytics
export const getAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // S4 — IDOR guard: a student can only view their own analytics
    if (req.user?.id !== id) {
      res.status(403).json({ success: false, message: "Forbidden" });
      return;
    }

    // Last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const entries = await AnalyticsEntry.find({
      studentId: id,
      date: { $gte: sevenDaysAgo.toISOString().split("T")[0] },
    }).sort({ date: 1 });

    // Build Chart.js-ready arrays
    const labels  = entries.map((e) => e.date.slice(5));  // MM-DD
    const phonics  = entries.map((e) => e.phonicsScore ?? 0);
    const reading  = entries.map((e) => e.readingAccuracy ?? 0);
    const memory   = entries.map((e) => e.memoryScore ?? 0);

    res.json({ success: true, labels, phonics, reading, memory, raw: entries });
  } catch (err) {
    res.status(500).json({ success: false, message: err instanceof Error ? err.message : "Error" });
  }
};
