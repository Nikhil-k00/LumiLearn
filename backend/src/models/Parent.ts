import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IParent extends Document {
  name: string;
  email: string;
  passwordHash: string;
  linkedStudentIds: Types.ObjectId[];
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

const ParentSchema = new Schema<IParent>(
  {
    name:             { type: String, required: true },
    email:            { type: String, required: true, unique: true, lowercase: true },
    passwordHash:     { type: String, required: true },
    linkedStudentIds: [{ type: Schema.Types.ObjectId, ref: "Student" }],
    role:             { type: String, default: "parent" },
  },
  { timestamps: true }
);

const Parent: Model<IParent> = mongoose.model<IParent>("Parent", ParentSchema);

export default Parent;
