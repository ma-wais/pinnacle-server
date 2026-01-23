import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { UserModel } from "../models/User.js";
import { UserProfileModel } from "../models/UserProfile.js";
import { DocumentModel } from "../models/Document.js";
import { notFound } from "../lib/httpErrors.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/users", async (_req, res) => {
  const users = await UserModel.find()
    .select("email role accountId verificationStatus createdAt")
    .sort({ createdAt: -1 });
  return res.json({ users });
});

router.get("/users/:id", async (req, res) => {
  const user = await UserModel.findById(req.params.id).select(
    "email role accountId verificationStatus createdAt",
  );
  const profile = await UserProfileModel.findOne({ userId: req.params.id });
  const documents = await DocumentModel.find({ userId: req.params.id }).sort({
    uploadedAt: -1,
  });
  return res.json({ user, profile, documents });
});

router.get("/documents/:id/download", async (req, res, next) => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) throw notFound("Document not found");

    if (doc.cloudinaryUrl) {
      return res.redirect(doc.cloudinaryUrl);
    }

    return res.status(400).json({ error: "No remote file found" });
  } catch (err) {
    return next(err);
  }
});

const verificationSchema = z.object({
  verificationStatus: z.enum(["unverified", "verified"]),
});

router.patch("/users/:id/verification", async (req, res, next) => {
  try {
    const input = verificationSchema.parse(req.body);
    const user = await UserModel.findByIdAndUpdate(
      req.params.id,
      { $set: { verificationStatus: input.verificationStatus } },
      { new: true },
    ).select("email role accountId verificationStatus");

    return res.json({ user });
  } catch (err) {
    return next(err);
  }
});

const docStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
});

router.patch("/documents/:id/status", async (req, res, next) => {
  try {
    const input = docStatusSchema.parse(req.body);
    const doc = await DocumentModel.findByIdAndUpdate(
      req.params.id,
      { $set: { status: input.status } },
      { new: true },
    );
    if (!doc) throw notFound("Document not found");
    return res.json({ document: doc });
  } catch (err) {
    return next(err);
  }
});

export default router;
