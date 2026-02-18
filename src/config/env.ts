import "dotenv/config";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  mongodbUri: requireEnv("MONGODB_URI"),
  jwtSecret: requireEnv("JWT_SECRET"),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  smtp: {
    host: process.env.SMTP_HOST || "smtp.office365.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    requireTLS: process.env.SMTP_REQUIRE_TLS !== "false",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from:
      process.env.SMTP_FROM || "Pinnacle Metals <noreply@pinnaclemetals.co.uk>",
  },
  goldApiKey: process.env.GOLD_API_KEY,
  copperPriceUrl: process.env.COPPER_PRICE_URL,
};

export const isProduction = env.nodeEnv === "production";
