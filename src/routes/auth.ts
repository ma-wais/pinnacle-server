import { Router } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";
import { UserModel } from "../models/User.js";
import { UserProfileModel } from "../models/UserProfile.js";
import { generateCandidateAccountId } from "../lib/accountId.js";
import { badRequest, unauthorized } from "../lib/httpErrors.js";
import { signAuthToken } from "../lib/auth.js";
import { isProduction } from "../config/env.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  fullName: z.string().min(2),
  phone: z.string().optional(),
  addressLine1: z.string().optional(),
  city: z.string().optional(),
  postcode: z.string().optional(),
  businessName: z.string().optional(),
});

router.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);

    const existing = await UserModel.findOne({ email: input.email });
    if (existing) throw badRequest("Email already in use");

    const passwordHash = await bcrypt.hash(input.password, 12);

    let accountId = generateCandidateAccountId();
    for (let i = 0; i < 5; i++) {
      const found = await UserModel.findOne({ accountId });
      if (!found) break;
      accountId = generateCandidateAccountId();
    }

    const user = await UserModel.create({
      email: input.email,
      passwordHash,
      role: "user",
      accountId,
      verificationStatus: "unverified",
    });

    await UserProfileModel.create({
      userId: user._id,
      fullName: input.fullName,
      phone: input.phone,
      addressLine1: input.addressLine1,
      city: input.city,
      postcode: input.postcode,
      businessName: input.businessName,
    });

    const token = signAuthToken({ sub: user._id.toString(), role: user.role });
    res.cookie("auth", token, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
    });

    return res.status(201).json({
      token,
      id: user._id,
      email: user.email,
      role: user.role,
      accountId: user.accountId,
      verificationStatus: user.verificationStatus,
    });
  } catch (err) {
    return next(err);
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body);

    const user = await UserModel.findOne({ email: input.email });
    if (!user) throw unauthorized("Invalid credentials");

    const ok = await bcrypt.compare(input.password, user.passwordHash);
    if (!ok) throw unauthorized("Invalid credentials");

    const token = signAuthToken({ sub: user._id.toString(), role: user.role });
    res.cookie("auth", token, {
      httpOnly: true,
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
    });

    return res.json({
      token,
      id: user._id,
      email: user.email,
      role: user.role,
      accountId: user.accountId,
      verificationStatus: user.verificationStatus,
    });
  } catch (err) {
    return next(err);
  }
});

router.post("/logout", async (_req, res) => {
  res.clearCookie("auth", {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
  });
  return res.json({ ok: true });
});

router.get("/me", async (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    let token = req.cookies?.auth;
    
    // Fallback to Bearer token
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    if (!token) return res.json({ user: null });

    try {
      const { verifyAuthToken } = await import("../lib/auth.js");
      const payload = verifyAuthToken(token);
      const user = await UserModel.findById(payload.sub).select(
        "email role accountId verificationStatus",
      );
      if (!user) return res.json({ user: null });
      return res.json({ user });
    } catch {
      return res.json({ user: null });
    }
  } catch (err) {
    return next(err);
  }
});

export default router;
