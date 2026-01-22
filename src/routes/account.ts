import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { UserModel } from "../models/User.js";
import { UserProfileModel } from "../models/UserProfile.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = await UserModel.findById(req.user!.id).select(
    "email role accountId verificationStatus"
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

router.put("/profile", requireAuth, async (req, res, next) => {
  try {
    const input = updateProfileSchema.parse(req.body);

    const profile = await UserProfileModel.findOneAndUpdate(
      { userId: req.user!.id },
      { $set: input },
      { new: true }
    );

    return res.json({ profile });
  } catch (err) {
    return next(err);
  }
});

export default router;
