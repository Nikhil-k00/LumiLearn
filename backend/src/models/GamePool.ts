import mongoose, { Schema, Document, Model, Types } from "mongoose";

/**
 * GamePool — pre-generated AI game content stored per student per gameType.
 *
 * How it works:
 *   - On registration OR when pool runs low (< LOW_WATER_MARK), the backend
 *     calls GPT-4o in the background and pushes new items into items[].
 *   - GET /api/games/pool/:gameType pops the first unconsumed item and returns it.
 *   - If remaining unconsumed < LOW_WATER_MARK, a background refill fires silently.
 *   - The game plays instantly from the pool — zero GPT wait during gameplay.
 */

export interface IGamePoolItem {
  content:     Record<string, unknown>; // full GPT-generated game content
  difficulty:  number;
  title:       string;
  generatedAt: Date;
  consumed:    boolean;
  consumedAt?: Date;
}

export interface IGamePool extends Document {
  studentId: Types.ObjectId;
  gameType:  "phonics_adventure" | "word_quest" | "memory_challenge";
  items:     IGamePoolItem[];
  createdAt: Date;
  updatedAt: Date;
}

const GamePoolItemSchema = new Schema<IGamePoolItem>(
  {
    content:     { type: Schema.Types.Mixed, required: true },
    difficulty:  { type: Number, default: 1 },
    title:       { type: String, default: "" },
    generatedAt: { type: Date, default: Date.now },
    consumed:    { type: Boolean, default: false },
    consumedAt:  { type: Date },
  },
  { _id: false }
);

const GamePoolSchema = new Schema<IGamePool>(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    gameType: {
      type: String,
      enum: ["phonics_adventure", "word_quest", "memory_challenge"],
      required: true,
    },
    items: [GamePoolItemSchema],
  },
  { timestamps: true }
);

// One pool document per student per gameType
GamePoolSchema.index({ studentId: 1, gameType: 1 }, { unique: true });

const GamePool: Model<IGamePool> = mongoose.model<IGamePool>("GamePool", GamePoolSchema);

export default GamePool;
