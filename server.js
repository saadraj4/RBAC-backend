import "dotenv/config";
import express from "express";
import cors from "cors";
import { prisma, validateEnv } from "./config/index.js";
import { sendError } from "./utils/index.js";
import apiRouter from "./routes/index.js";

validateEnv();

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Global middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use("/api", apiRouter);

// ─── Health check ───────────────────────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ success: true, message: "Server is running" });
});

// ─── 404 handler ────────────────────────────────────────────────────────────
app.use((_req, res) => {
  sendError(res, { message: "Route not found.", statusCode: 404 });
});

// ─── Centralized error handler ──────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  sendError(res, {
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
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});
