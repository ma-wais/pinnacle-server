import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { storage } from "../lib/cloudinary.js";
import { requireAuth } from "../middleware/auth.js";
import { badRequest, forbidden, notFound } from "../lib/httpErrors.js";
import { DocumentModel } from "../models/Document.js";
import { UserModel } from "../models/User.js";

const router = Router();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    // Allow all file types as requested
    return cb(null, true);
  },
});

router.get("/", requireAuth, async (req, res) => {
  const docs = await DocumentModel.find({ userId: req.user!.id }).sort({
    uploadedAt: -1,
  });
  return res.json({ documents: docs });
});

const uploadMetaSchema = z.object({
  type: z.enum(["all", "id", "proof_of_address", "business_doc"]),
});

router.post("/", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    const meta = uploadMetaSchema.parse(req.body);
    if (!req.file) throw badRequest("Missing file");

    const file = req.file as any;

    const doc = await DocumentModel.create({
      userId: req.user!.id,
      type: meta.type,
      originalName: file.originalname,
      storageName: file.filename || file.originalname || "unknown", // Fallback for some cloudinary responses
      mimeType: file.mimetype,
      size: file.size,
      cloudinaryUrl: file.path, // Full Cloudinary URL
      cloudinaryId: file.filename || file.originalname || "unknown",
      status: "pending",
      uploadedAt: new Date(),
    });

    return res.status(201).json({ document: doc });
  } catch (err) {
    return next(err);
  }
});

router.get("/:id/download", requireAuth, async (req, res, next) => {
  try {
    const doc = await DocumentModel.findById(req.params.id);
    if (!doc) throw notFound("Document not found");

    if (doc.userId.toString() !== req.user!.id) {
      const user = await UserModel.findById(req.user!.id).select("role");
      if (!user || user.role !== "admin") throw forbidden();
    }

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

export default router;
