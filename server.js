require("dotenv").config();

const validateEnv = require("./config/validateEnv");
validateEnv();

const express = require("express");
const cors = require("cors");
const prisma = require("./config/db");
const { sendError } = require("./utils/response");

const authRoutes = require("./routes/authRoutes");
const roleRoutes = require("./routes/roleRoutes");
const userRoutes = require("./routes/userRoutes");

const app = express();
const PORT = process.env.PORT;

// ─── Global middleware ──────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ─── Routes ─────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/roles", roleRoutes);
app.use("/api/users", userRoutes);

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
