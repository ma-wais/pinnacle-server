import mongoose, { Schema, Document } from "mongoose";

export interface IComplaint extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  message: string;
  status: "pending" | "resolved";
  createdAt: Date;
  updatedAt: Date;
}

const ComplaintSchema: Schema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
    },
  },
  { timestamps: true },
);

export const ComplaintModel = mongoose.model<IComplaint>(
  "Complaint",
  ComplaintSchema,
);
