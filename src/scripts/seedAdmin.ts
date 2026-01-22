import mongoose from "mongoose";
import bcrypt from "bcrypt";
import { env } from "../config/env.js";
import { UserModel } from "../models/User.js";
import { generateCandidateAccountId } from "../lib/accountId.js";

function getArg(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

async function main() {
  const email = (getArg("--email") ?? process.env.ADMIN_EMAIL)?.toLowerCase();
  const password = getArg("--password") ?? process.env.ADMIN_PASSWORD;
  const promoteOnly = process.argv.includes("--promote");

  if (!email) {
    throw new Error("Missing admin email. Provide --email or ADMIN_EMAIL");
  }
  if (!promoteOnly && !password) {
    throw new Error(
      "Missing admin password. Provide --password or ADMIN_PASSWORD (or use --promote to only promote an existing user)"
    );
  }

  await mongoose.connect(env.mongodbUri);

  const existing = await UserModel.findOne({ email });

  if (existing) {
    existing.role = "admin";
    if (password) {
      existing.passwordHash = await bcrypt.hash(password, 12);
    }
    await existing.save();

    console.log("Admin ready (existing user updated):");
    console.log({
      email: existing.email,
      accountId: existing.accountId,
      role: existing.role,
    });
    return;
  }

  if (promoteOnly) {
    throw new Error(
      "User not found to promote. Remove --promote to create a new admin user."
    );
  }

  let accountId = generateCandidateAccountId();
  for (let i = 0; i < 5; i++) {
    const found = await UserModel.findOne({ accountId });
    if (!found) break;
    accountId = generateCandidateAccountId();
  }

  const passwordHash = await bcrypt.hash(password!, 12);
  const user = await UserModel.create({
    email,
    passwordHash,
    role: "admin",
    accountId,
    verificationStatus: "verified",
  });

  console.log("Admin created:");
  console.log({
    email: user.email,
    accountId: user.accountId,
    role: user.role,
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
