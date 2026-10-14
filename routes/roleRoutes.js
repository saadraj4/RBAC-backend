import { Router } from "express";
import { roleController } from "../controllers/index.js";
import { authenticate, validate } from "../middleware/index.js";
import {
  createRoleSchema,
  updateRoleSchema,
  roleIdParamSchema,
} from "../validators/index.js";
import { asyncHandler } from "../utils/index.js";

const router = Router();

// Named action endpoints
router.get("/get-all", authenticate, asyncHandler(roleController.getRoles));

router.get(
  "/get/:id",
  authenticate,
  validate(roleIdParamSchema, "params"),
  asyncHandler(roleController.getRoleById)
);

router.post(
  "/create",
  authenticate,
  validate(createRoleSchema),
  asyncHandler(roleController.createRole)
);

router.put(
  "/update/:id",
  authenticate,
  validate({ params: roleIdParamSchema, body: updateRoleSchema }),
  asyncHandler(roleController.updateRole)
);

router.delete(
  "/delete/:id",
  authenticate,
  validate(roleIdParamSchema, "params"),
  asyncHandler(roleController.deleteRole)
);

export default router;
