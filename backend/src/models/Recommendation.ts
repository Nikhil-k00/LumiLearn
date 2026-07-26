import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IActivity {
  type?: string;
  title?: string;
  description?: string;
  gameType?: string;
  targetArea?: string;
  difficulty?: number;
  estimatedMinutes?: number;
  content?: Record<string, any>;
}

export interface IDifficultyAdjustments {
  reading?: number;
  speech?: number;
  memory?: number;
  writing?: number;
  phonics?: number;
}

export interface IRecommendation extends Document {
  studentId: Types.ObjectId;
  generatedAt: Date;
  activities: IActivity[];
  focusAreas: string[];
  difficultyAdjustments: IDifficultyAdjustments;
  encouragementMessage?: string;
  gptResponseRaw?: string;
  createdAt: Date;
  updatedAt: Date;
}

const RecommendationSchema = new Schema<IRecommendation>(
  {
    studentId:    { type: Schema.Types.ObjectId, ref: "Student", required: true },
    generatedAt:  { type: Date, default: Date.now },
    activities: [
      {
        type:             { type: String },
        title:            { type: String },
        description:      { type: String },
        gameType:         { type: String },
        targetArea:       { type: String },
        difficulty:       { type: Number },
        estimatedMinutes: { type: Number },
        content:          { type: Schema.Types.Mixed },
      },
    ],
    focusAreas: [{ type: String }],
    difficultyAdjustments: {
      reading: { type: Number },
      speech:  { type: Number },
      memory:  { type: Number },
      writing: { type: Number },
      phonics: { type: Number },
    },
    encouragementMessage: { type: String },
    gptResponseRaw:       { type: String },
  },
  { timestamps: true }
);

const Recommendation: Model<IRecommendation> = mongoose.model<IRecommendation>(
  "Recommendation",
  RecommendationSchema
);

export default Recommendation;
