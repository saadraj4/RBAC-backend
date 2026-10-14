import { Router } from "express";
import { userController } from "../controllers/index.js";
import { authenticate, validate } from "../middleware/index.js";
import {
  createUserSchema,
  updateUserSchema,
  userStatusSchema,
  userIdParamSchema,
} from "../validators/index.js";
import { asyncHandler } from "../utils/index.js";

const router = Router();

// Named action endpoints
router.post(
  "/create",
  authenticate,
  validate(createUserSchema),
  asyncHandler(userController.createUser)
);

router.get("/get-all", authenticate, asyncHandler(userController.getUsers));

router.get(
  "/get/:id",
  authenticate,
  validate(userIdParamSchema, "params"),
  asyncHandler(userController.getUserById)
);

router.put(
  "/update/:id",
  authenticate,
  validate({ params: userIdParamSchema, body: updateUserSchema }),
  asyncHandler(userController.updateUser)
);

router.delete(
  "/delete/:id",
  authenticate,
  validate(userIdParamSchema, "params"),
  asyncHandler(userController.deleteUser)
);

router.patch(
  "/status/:id",
  authenticate,
  validate({ params: userIdParamSchema, body: userStatusSchema }),
  asyncHandler(userController.updateUserStatus)
);

export default router;
