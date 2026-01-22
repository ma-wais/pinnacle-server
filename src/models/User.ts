import mongoose, { Schema } from "mongoose";

export type UserRole = "user" | "admin";
export type VerificationStatus = "unverified" | "verified";

export type UserDoc = {
  _id: mongoose.Types.ObjectId;
  email: string;
  passwordHash: string;
  role: UserRole;
  accountId: string;
  verificationStatus: VerificationStatus;
  createdAt: Date;
  updatedAt: Date;
};

const userSchema = new Schema<UserDoc>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      required: true,
      enum: ["user", "admin"],
      default: "user",
    },
    accountId: { type: String, required: true, unique: true },
    verificationStatus: {
      type: String,
      required: true,
      enum: ["unverified", "verified"],
      default: "unverified",
    },
  },
  { timestamps: true }
);

export const UserModel =
  mongoose.models.User || mongoose.model<UserDoc>("User", userSchema);
