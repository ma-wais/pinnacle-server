import mongoose from "mongoose";
import { env } from "./config/env.js";
import { createApp } from "./app.js";

async function main() {
  await mongoose.connect(env.mongodbUri);

  const app = createApp();
  app.listen(env.port, () => {
    console.log(`API listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
