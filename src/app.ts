import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { env, isProduction } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";

import authRoutes from "./routes/auth.js";
import accountRoutes from "./routes/account.js";
import documentRoutes from "./routes/documents.js";
import adminRoutes from "./routes/admin.js";
import pricesRoutes from "./routes/prices.js";

export function createApp() {
  const app = express();

  // Required for Render/Vercel proxies to handle cookies/HTTPS correctly
  app.set("trust proxy", 1);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        // Allow all origins for now to ensure frontends can connect
        callback(null, true);
      },
      credentials: true,
    }),
  );

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: "1mb" }));

  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 200,
      standardHeaders: "draft-8",
      legacyHeaders: false,
    }),
  );

  app.get("/api/health", (_req, res) => res.json({ ok: true }));

  app.use("/api/auth", authRoutes);
  app.use("/api/account", accountRoutes);
  app.use("/api/documents", documentRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/prices", pricesRoutes);

  // In production, tighten cookie security (cookie set in routes)
  if (isProduction) {
    // nothing else needed here yet
  }

  app.use(errorHandler);

  return app;
}
