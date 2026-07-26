import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IAnalyticsEntry extends Document {
  studentId: Types.ObjectId;
  date: string;
  readingAccuracy: number;
  pronunciationScore: number;
  memoryScore: number;
  writingScore: number;
  phonicsScore: number;
  sessionTime: number;
  totalGamesPlayed: number;
  xpEarned: number;
  createdAt: Date;
  updatedAt: Date;
}

const AnalyticsEntrySchema = new Schema<IAnalyticsEntry>(
  {
    studentId:          { type: Schema.Types.ObjectId, ref: "Student", required: true },
    date:               { type: String, required: true },
    readingAccuracy:    { type: Number, min: 0, max: 100, default: 0 },
    pronunciationScore: { type: Number, min: 0, max: 100, default: 0 },
    memoryScore:        { type: Number, min: 0, max: 100, default: 0 },
    writingScore:       { type: Number, min: 0, max: 100, default: 0 },
    phonicsScore:       { type: Number, min: 0, max: 100, default: 0 },
    sessionTime:        { type: Number, default: 0 },
    totalGamesPlayed:   { type: Number, default: 0 },
    xpEarned:           { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Unique compound index — one document per student per day.
// Prevents duplicate rows from concurrent upserts.
AnalyticsEntrySchema.index({ studentId: 1, date: 1 }, { unique: true });

const AnalyticsEntry: Model<IAnalyticsEntry> = mongoose.model<IAnalyticsEntry>(
  "AnalyticsEntry",
  AnalyticsEntrySchema
);

export default AnalyticsEntry;
