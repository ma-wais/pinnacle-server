import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { requireAuth } from "../middleware/auth.js";
import { UserModel } from "../models/User.js";
import { UserProfileModel } from "../models/UserProfile.js";
import { badRequest } from "../lib/httpErrors.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.user!.id).select(
    "email role accountId verificationStatus",
  );
  const profile = await UserProfileModel.findOne({
    userId: req.user!.id,
  }).select("fullName phone addressLine1 city postcode businessName");

  return res.json({ user, profile });
});

const updateProfileSchema = z.object({
  fullName: z.string().min(2).optional(),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  businessName: z.string().optional(),
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

router.put("/profile", requireAuth, async (req, res, next) => {
  try {
    const input = updateProfileSchema.parse(req.body);

    const profile = await UserProfileModel.findOneAndUpdate(
      { userId: req.user!.id },
      { $set: input },
      { new: true, upsert: true },
    );

    return res.json({ profile });
  } catch (err) {
    return next(err);
  }
});

router.post("/change-password", requireAuth, async (req, res, next) => {
  try {
    const input = changePasswordSchema.parse(req.body);

    const user = await UserModel.findById(req.user!.id);
    if (!user) throw badRequest("User not found");

    const isMatch = await bcrypt.compare(
      input.currentPassword,
      user.passwordHash,
    );
    if (!isMatch) throw badRequest("Current password is incorrect");

    user.passwordHash = await bcrypt.hash(input.newPassword, 12);
    await user.save();

    return res.json({ message: "Password updated successfully" });
  } catch (err) {
    return next(err);
  }
});

export default router;
