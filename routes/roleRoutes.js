const { Router } = require("express");
const roleController = require("../controllers/roleController");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const {
  createRoleSchema,
  updateRoleSchema,
  roleIdParamSchema,
} = require("../validators/roleValidator");
const asyncHandler = require("../utils/asyncHandler");

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

module.exports = router;
