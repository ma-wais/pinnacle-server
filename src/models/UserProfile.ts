import mongoose, { Schema } from "mongoose";

export type UserProfileDoc = {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  fullName: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  postcode?: string;
  businessName?: string;
  createdAt: Date;
  updatedAt: Date;
};

const userProfileSchema = new Schema<UserProfileDoc>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    addressLine1: { type: String, trim: true },
    city: { type: String, trim: true },
    postcode: { type: String, trim: true },
    businessName: { type: String, trim: true },
  },
  { timestamps: true }
);

export const UserProfileModel =
  mongoose.models.UserProfile ||
  mongoose.model<UserProfileDoc>("UserProfile", userProfileSchema);
