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
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
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
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
  },
  { timestamps: true },
);

export const UserModel =
  mongoose.models.User || mongoose.model<UserDoc>("User", userSchema);
