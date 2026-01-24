import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { UserModel } from "../models/User.js";
import { UserProfileModel } from "../models/UserProfile.js";
import { DocumentModel } from "../models/Document.js";
import { notFound } from "../lib/httpErrors.js";
import cloudinary from "../lib/cloudinary.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/users", async (_req, res) => {
  const users = await UserModel.find()
    .select("email role accountId verificationStatus createdAt")
    .sort({ createdAt: -1 });
  return res.json({ users });
});

router.get("/users/export", async (_req, res) => {
  const users = await UserModel.find().sort({ createdAt: -1 });
  const exportedData = await Promise.all(
    users.map(async (user) => {
      const profile = await UserProfileModel.findOne({ userId: user._id });
      return {
        id: user._id,
        email: user.email,
        accountId: user.accountId,
        role: user.role,
        verificationStatus: user.verificationStatus,
        createdAt: user.createdAt,
        fullName: profile?.fullName || "",
        phone: profile?.phone || "",
        businessName: profile?.businessName || "",
      };
    }),
  );
  return res.json({ users: exportedData });
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

router.delete("/users/:id", async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id);
    if (!user) throw notFound("User not found");

    // Delete documents from cloudinary
    const documents = await DocumentModel.find({ userId: user._id });
    for (const doc of documents) {
      if (doc.cloudinaryId) {
        await cloudinary.uploader.destroy(doc.cloudinaryId);
      }
    }

    // Delete everything
    await DocumentModel.deleteMany({ userId: user._id });
    await UserProfileModel.deleteOne({ userId: user._id });
    await UserModel.findByIdAndDelete(user._id);

    return res.json({
      message: "User and all associated data deleted successfully",
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/documents/:id/preview", async (req, res, next) => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) throw notFound("Document not found");

    if (doc.cloudinaryUrl) {
      const response = await fetch(doc.cloudinaryUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.setHeader(
        "Content-Disposition",
        `inline; filename="${doc.originalName}"`,
      );
      res.setHeader("Content-Type", doc.mimeType);
      return res.send(buffer);
    }

    return res.status(400).json({ error: "No remote file found" });
  } catch (err) {
    return next(err);
  }
});

router.get("/documents/:id/download", async (req, res, next) => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) throw notFound("Document not found");

    if (doc.cloudinaryUrl) {
      const response = await fetch(doc.cloudinaryUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${doc.originalName}"`,
      );
      res.setHeader("Content-Type", doc.mimeType);
      return res.send(buffer);
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

router.delete("/documents/:id", async (req, res, next) => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) throw notFound("Document not found");

    if (doc.cloudinaryId) {
      await cloudinary.uploader.destroy(doc.cloudinaryId);
    }

    await DocumentModel.findByIdAndDelete(req.params.id);
    return res.json({ message: "Document deleted successfully" });
  } catch (err) {
    return next(err);
  }
});

export default router;
