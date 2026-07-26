import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStudent extends Document {
  name: string;
  age: number;
  grade?: number;
  parentEmail: string;
  passwordHash: string;
  preferredLanguage: string;
  favoriteCharacter?: string;
  favoriteTheme?: string;
  learningInterests: string[];
  readingLevel: "beginner" | "emerging" | "developing" | "fluent";
  avatarId: string;
  xp: number;
  coins: number;
  level: number;
  streak: number;
  lastActiveDate?: Date;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const StudentSchema = new Schema<IStudent>(
  {
    name:               { type: String, required: true },
    age:                { type: Number, required: true, min: 4, max: 14 },
    grade:              { type: Number },
    parentEmail:        { type: String, required: true },
    passwordHash:       { type: String, required: true },
    preferredLanguage:  { type: String, default: "English" },
    favoriteCharacter:  { type: String },
    favoriteTheme:      { type: String },
    learningInterests:  [{ type: String }],
    readingLevel: {
      type: String,
      enum: ["beginner", "emerging", "developing", "fluent"],
      default: "beginner",
    },
    avatarId:       { type: String, default: "explorer" },
    xp:             { type: Number, default: 0 },
    coins:          { type: Number, default: 0 },
    level:          { type: Number, default: 1 },
    streak:         { type: Number, default: 0 },
    lastActiveDate: { type: Date },
    role:           { type: String, default: "student" },
  },
  { timestamps: true }
);

const Student: Model<IStudent> = mongoose.model<IStudent>("Student", StudentSchema);

export default Student;
