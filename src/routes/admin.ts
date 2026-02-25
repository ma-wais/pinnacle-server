import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireAdmin } from "../middleware/auth.js";
import { UserModel } from "../models/User.js";
import { UserProfileModel } from "../models/UserProfile.js";
import { DocumentModel } from "../models/Document.js";
import { ComplaintModel } from "../models/Complaint.js";
import { PricingConfigModel } from "../models/PricingConfig.js";
import { notFound } from "../lib/httpErrors.js";
import cloudinary from "../lib/cloudinary.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/stats", async (_req, res) => {
  const [
    totalUsers,
    unverifiedUsers,
    verifiedUsers,
    totalDocuments,
    pendingDocuments,
    approvedDocuments,
    rejectedDocuments,
  ] = await Promise.all([
    UserModel.countDocuments(),
    UserModel.countDocuments({ verificationStatus: "unverified" }),
    UserModel.countDocuments({ verificationStatus: "verified" }),
    DocumentModel.countDocuments(),
    DocumentModel.countDocuments({ status: "pending" }),
    DocumentModel.countDocuments({ status: "approved" }),
    DocumentModel.countDocuments({ status: "rejected" }),
  ]);

  return res.json({
    totalUsers,
    unverifiedUsers,
    verifiedUsers,
    totalDocuments,
    pendingDocuments,
    approvedDocuments,
    rejectedDocuments,
  });
});

router.get("/pricing", async (_req, res) => {
  let config = await PricingConfigModel.findOne();

  if (!config) {
    config = await PricingConfigModel.create({
      baseCopperPrice: 0,
      updatedAt: new Date(),
    });
  }

  return res.json({
    baseCopperPrice: config.baseCopperPrice,
    updatedAt: config.updatedAt,
  });
});

const pricingSchema = z.object({
  baseCopperPrice: z.number().min(0),
});

router.patch("/pricing", async (req, res, next) => {
  try {
    const input = pricingSchema.parse(req.body);
    let config = await PricingConfigModel.findOne();

    if (!config) {
      config = new PricingConfigModel();
    }

    config.baseCopperPrice = input.baseCopperPrice;
    config.updatedAt = new Date();
    await config.save();

    return res.json({
      baseCopperPrice: config.baseCopperPrice,
      updatedAt: config.updatedAt,
    });
  } catch (err) {
    return next(err);
  }
});

router.get("/complaints", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;

  const query: any = {};
  if (status && (status === "pending" || status === "resolved")) {
    query.status = status;
  }

  const total = await ComplaintModel.countDocuments(query);
  const complaints = await ComplaintModel.find(query)
    .populate({
      path: "userId",
      select: "email",
    })
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  // Manually attach profiles since populate-of-virtuals or deep-populate might be tricky depending on setup
  const complaintsWithProfiles = await Promise.all(
    complaints.map(async (c: any) => {
      const profile = await UserProfileModel.findOne({ userId: c.userId?._id });
      const plain = c.toObject();
      if (plain.userId) {
        plain.userId.profile = profile;
      }
      return plain;
    }),
  );

  return res.json({
    complaints: complaintsWithProfiles,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  });
});

router.get("/documents", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;

  const query: any = {};
  if (status && ["pending", "approved", "rejected"].includes(status)) {
    query.status = status;
  }

  const total = await DocumentModel.countDocuments(query);
  const documents = await DocumentModel.find(query)
    .populate({
      path: "userId",
      select: "email accountId",
    })
    .sort({ uploadedAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const docsWithProfiles = await Promise.all(
    documents.map(async (doc: any) => {
      const profile = await UserProfileModel.findOne({
        userId: doc.userId?._id,
      });
      const plain = doc.toObject();
      if (plain.userId) {
        plain.userId.profile = profile;
      }
      return plain;
    }),
  );

  return res.json({
    documents: docsWithProfiles,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  });
});

router.patch("/complaints/:id/status", async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["pending", "resolved"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }
    const complaint = await ComplaintModel.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true },
    );
    if (!complaint) throw notFound("Complaint not found");
    return res.json({ complaint });
  } catch (err) {
    return next(err);
  }
});

router.get("/users", async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;

  const query: any = {};
  if (status && (status === "verified" || status === "unverified")) {
    query.verificationStatus = status;
  }

  const total = await UserModel.countDocuments(query);
  const users = await UserModel.find(query)
    .select("email role accountId verificationStatus createdAt")
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

  const usersWithProfile = await Promise.all(
    users.map(async (user) => {
      const profile = await UserProfileModel.findOne({ userId: user._id });
      return {
        ...user.toObject(),
        fullName: profile?.fullName || "",
      };
    }),
  );

  return res.json({
    users: usersWithProfile,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / limit),
    },
  });
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
    if (req.params.id === req.user!.id) {
      return res
        .status(400)
        .json({ error: "You cannot delete your own admin account" });
    }

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
