import crypto from "node:crypto";

export function generateCandidateAccountId(): string {
  const bytes = crypto.randomBytes(5);
  const token = bytes.toString("hex").toUpperCase();
  return `PM-${token}`;
}
