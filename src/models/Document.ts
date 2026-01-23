import mongoose, { Schema } from "mongoose";

export type DocumentStatus = "pending" | "accepted" | "rejected";
export type DocumentType = "id" | "proof_of_address" | "business_doc" | "other";

export type DocumentDoc = {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: DocumentType;
  originalName: string;
  storageName: string;
  mimeType: string;
  size: number;
  cloudinaryUrl?: string;
  cloudinaryId?: string;
  status: DocumentStatus;
  uploadedAt: Date;
};

const documentSchema = new Schema<DocumentDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["id", "proof_of_address", "business_doc", "other"],
    },
    originalName: { type: String, required: true },
    storageName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    cloudinaryUrl: { type: String },
    cloudinaryId: { type: String },
    status: {
      type: String,
      required: true,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
    uploadedAt: { type: Date, required: true, default: Date.now },
  },
  { timestamps: false },
);

export const DocumentModel =
  mongoose.models.Document ||
  mongoose.model<DocumentDoc>("Document", documentSchema);
