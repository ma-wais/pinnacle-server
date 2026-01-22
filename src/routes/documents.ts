import { Router } from "express";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { badRequest, forbidden, notFound } from "../lib/httpErrors.js";
import { DocumentModel } from "../models/Document.js";
import { UserModel } from "../models/User.js";

const router = Router();

const storageDir = path.resolve(process.cwd(), "storage", "documents");
if (!fs.existsSync(storageDir)) fs.mkdirSync(storageDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, storageDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname);
      const name = crypto.randomBytes(16).toString("hex") + ext;
      cb(null, name);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowed.includes(file.mimetype))
      return cb(badRequest("Unsupported file type"));
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
  type: z.enum(["id", "proof_of_address", "business_doc", "other"]),
});

router.post("/", requireAuth, upload.single("file"), async (req, res, next) => {
  try {
    const meta = uploadMetaSchema.parse(req.body);
    if (!req.file) throw badRequest("Missing file");

    const doc = await DocumentModel.create({
      userId: req.user!.id,
      type: meta.type,
      originalName: req.file.originalname,
      storageName: req.file.filename,
      mimeType: req.file.mimetype,
      size: req.file.size,
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

    const absPath = path.resolve(storageDir, doc.storageName);
    if (!absPath.startsWith(storageDir + path.sep)) throw forbidden();

    return res.download(absPath, doc.originalName);
  } catch (err) {
    return next(err);
  }
});

export default router;
