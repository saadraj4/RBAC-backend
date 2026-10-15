import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { prisma, pool, validateEnv, corsOptions } from "./config/index.js";
import { generalLimiter } from "./middleware/index.js";
import { sendError } from "./utils/index.js";
import apiRouter from "./routes/index.js";

validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security & Global Middleware ───────────────────────────────────────────
app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json());

// ─── API Routes with General Rate Limiting ──────────────────────────────────
app.use("/api", generalLimiter, apiRouter);

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    pool: {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
    },
  });
});

// ─── 404 handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  sendError(res, { message: "Route not found.", statusCode: 404 });
});

// ─── Centralized error handler (Handles AppError & Unhandled Errors) ─────────
app.use((err, _req, res, _next) => {
  // Operational / Domain AppError
  if (err.statusCode && err.statusCode < 500) {
    return sendError(res, {
      message: err.message,
      statusCode: err.statusCode,
      code: err.code || null,
    });
  }

  console.error("Unhandled error:", err);
  return sendError(res, {
    message: "Internal server error.",
    statusCode: 500,
  });
});

// ─── Start server ───────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  await pool.end();
  process.exit(0);
});
