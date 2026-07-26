import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMistakeEntry {
  item: string;
  studentAnswer: string;
  correct: string;
}

export interface IGameSession extends Document {
  studentId: Types.ObjectId;
  gameType: "phonics_adventure" | "word_quest" | "memory_challenge";
  score: number;
  xpEarned: number;
  accuracy: number;
  duration: number;
  mistakeLog: IMistakeEntry[];
  confusionMatrix: Map<string, number>;
  completedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const GameSessionSchema = new Schema<IGameSession>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    gameType: {
      type: String,
      enum: ["phonics_adventure", "word_quest", "memory_challenge"],
    },
    score:    { type: Number, default: 0 },
    xpEarned: { type: Number, default: 0 },
    accuracy: { type: Number, min: 0, max: 100 },
    duration: { type: Number },
    mistakeLog: [
      {
        item:          { type: String },
        studentAnswer: { type: String },
        correct:       { type: String },
      },
    ],
    confusionMatrix: { type: Map, of: Number },
    completedAt:     { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const GameSession: Model<IGameSession> = mongoose.model<IGameSession>(
  "GameSession",
  GameSessionSchema
);

export default GameSession;
