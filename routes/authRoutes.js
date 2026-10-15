import { Router } from "express";
import { authController } from "../controllers/index.js";
import { authenticate, validate, authLimiter } from "../middleware/index.js";
import {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} from "../validators/index.js";
import { asyncHandler } from "../utils/index.js";

const router = Router();

router.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  asyncHandler(authController.register)
);

router.post(
  "/login",
  authLimiter,
  validate(loginSchema),
  asyncHandler(authController.login)
);

router.post(
  "/refresh",
  validate(refreshSchema),
  asyncHandler(authController.refresh)
);

router.post(
  "/logout",
  validate(logoutSchema),
  asyncHandler(authController.logout)
);

router.get("/me", authenticate, asyncHandler(authController.me));

export default router;
