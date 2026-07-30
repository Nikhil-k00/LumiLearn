import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ICurrentDifficulty {
  reading: number;
  speech: number;
  memory: number;
  writing: number;
  phonics: number;
}

export interface IGoodSessionStreak {
  reading: number;
  memory: number;
  phonics: number;
}

export interface ILearningProfile extends Document {
  studentId: Types.ObjectId;
  readingScore: number;
  speechScore: number;
  memoryScore: number;
  writingScore: number;
  phonicsScore: number;
  attentionScore: number;
  commonErrors: string[];
  weakAreas: string[];
  strongAreas: string[];
  currentMission?: string;
  currentDifficulty: ICurrentDifficulty;
  // Consecutive ≥80% session count per domain — difficulty only advances at 2+
  goodSessionStreak: IGoodSessionStreak;
  createdAt: Date;
  updatedAt: Date;
}

const scoreField = { type: Number, default: 50, min: 0, max: 100 };
const difficultyField = { type: Number, default: 1, min: 1, max: 5 };
// Tracks how many consecutive ≥80% sessions per domain.
// Difficulty only advances after 2 consecutive good sessions — gentler for dyslexia students.
const streakField = { type: Number, default: 0, min: 0 };

const LearningProfileSchema = new Schema<ILearningProfile>(
  {
    studentId:      { type: Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
    readingScore:   scoreField,
    speechScore:    scoreField,
    memoryScore:    scoreField,
    writingScore:   scoreField,
    phonicsScore:   scoreField,
    attentionScore: scoreField,
    commonErrors:   [{ type: String }],
    weakAreas:      [{ type: String }],
    strongAreas:    [{ type: String }],
    currentMission: { type: String },
    currentDifficulty: {
      reading: difficultyField,
      speech:  difficultyField,
      memory:  difficultyField,
      writing: difficultyField,
      phonics: difficultyField,
    },
    // Consecutive good-session streak per domain (resets on any session < 80%)
    goodSessionStreak: {
      reading: streakField,
      memory:  streakField,
      phonics: streakField,
    },
  },
  { timestamps: true }
);

const LearningProfile: Model<ILearningProfile> = mongoose.model<ILearningProfile>(
  "LearningProfile",
  LearningProfileSchema
);

export default LearningProfile;
