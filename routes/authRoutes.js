const { Router } = require("express");
const authController = require("../controllers/authController");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
} = require("../validators/authValidator");
const asyncHandler = require("../utils/asyncHandler");

const router = Router();

router.post(
  "/register",
  validate(registerSchema),
  asyncHandler(authController.register)
);

router.post(
  "/login",
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

module.exports = router;
