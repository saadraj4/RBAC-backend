/**
 * CORS Configuration
 * Parses comma-separated allowlist from CORS_ALLOWED_ORIGINS env variable.
 * Supports credentials and allows requests with no origin (Postman, mobile, curl).
 */
export function getCorsOptions() {
  const rawOrigins = process.env.CORS_ALLOWED_ORIGINS || "";
  const allowedOrigins = rawOrigins
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, Postman)
      if (!origin) return callback(null, true);

      // If allowlist contains wildcard or matching origin
      if (allowedOrigins.length === 0 || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked: Origin '${origin}' is not allowed.`)
      );
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
}

export const corsOptions = getCorsOptions();
