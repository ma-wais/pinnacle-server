import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export type JwtUserPayload = {
  sub: string;
  role: "user" | "admin";
};

export function signAuthToken(payload: JwtUserPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "7d" });
}

export function verifyAuthToken(token: string): JwtUserPayload {
  return jwt.verify(token, env.jwtSecret) as JwtUserPayload;
}
