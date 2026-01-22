import type { Request, Response, NextFunction } from "express";
import { verifyAuthToken } from "../lib/auth.js";
import { unauthorized, forbidden } from "../lib/httpErrors.js";

export type AuthedUser = {
  id: string;
  role: "user" | "admin";
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthedUser;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.auth;
  if (!token) return next(unauthorized());

  try {
    const payload = verifyAuthToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch {
    return next(unauthorized());
  }
}

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(unauthorized());
  if (req.user.role !== "admin") return next(forbidden());
  return next();
}
