import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAchievement extends Document {
  studentId: Types.ObjectId;
  badgeId: string;
  name: string;
  description?: string;
  emoji?: string;
  earnedAt: Date;
}

const AchievementSchema = new Schema<IAchievement>({
  studentId:   { type: Schema.Types.ObjectId, ref: "Student", required: true },
  badgeId:     { type: String, required: true },
  name:        { type: String, required: true },
  description: { type: String },
  emoji:       { type: String },
  earnedAt:    { type: Date, default: Date.now },
});

// Enforce the business invariant that each student can only earn a specific badge once.
// This prevents races where two nearly simultaneous sessions both read "not yet earned"
// and then insert the same badge document.
AchievementSchema.index({ studentId: 1, badgeId: 1 }, { unique: true });

const Achievement: Model<IAchievement> = mongoose.model<IAchievement>(
  "Achievement",
  AchievementSchema
);

export default Achievement;
