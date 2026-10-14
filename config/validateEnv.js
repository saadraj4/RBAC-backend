/**
 * Validates that all required environment variables are set.
 * Call this on startup — fails fast with a clear error.
 */
const REQUIRED_VARS = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "ACCESS_TOKEN_EXPIRES_IN",
  "REFRESH_TOKEN_EXPIRES_IN",
  "BCRYPT_SALT_ROUNDS",
];

export default function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(
      `❌  Missing required environment variables:\n   ${missing.join("\n   ")}`
    );
    process.exit(1);
  }
}
