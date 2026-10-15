import rateLimit from "express-rate-limit";

const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15;
const maxGeneral = parseInt(process.env.RATE_LIMIT_MAX_GENERAL, 10) || 300;
const maxAuth = parseInt(process.env.RATE_LIMIT_MAX_AUTH, 10) || 30;

/**
 * General API Rate Limiter.
 * Configured via RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX_GENERAL in .env.
 */
export const generalLimiter = rateLimit({
  windowMs: windowMs * 60 * 1000,
  max: maxGeneral,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests from this IP. Please try again later.",
    code: "TOO_MANY_REQUESTS",
  },
});

/**
 * Strict Auth Rate Limiter.
 * Configured via RATE_LIMIT_WINDOW_MS and RATE_LIMIT_MAX_AUTH in .env.
 */
export const authLimiter = rateLimit({
  windowMs,
  max: maxAuth,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many authentication attempts. Please try again after the timeout window.",
    code: "TOO_MANY_REQUESTS",
  },
});
