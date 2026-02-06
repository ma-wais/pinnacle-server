import type { Request, Response, NextFunction } from "express";
import { HttpError } from "../lib/httpErrors.js";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: "Validation failed",
      details: err.issues.map((e) => ({ path: e.path, message: e.message })),
    });
  }

  console.error(err);
  return res.status(500).json({
    error: "Internal Server Error",
    message: err instanceof Error ? err.message : "Unknown error",
  });
}
