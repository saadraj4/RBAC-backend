const { Router } = require("express");
const userController = require("../controllers/userController");
const authenticate = require("../middleware/authenticate");
const validate = require("../middleware/validate");
const {
  createUserSchema,
  updateUserSchema,
  userStatusSchema,
  userIdParamSchema,
} = require("../validators/userValidator");
const asyncHandler = require("../utils/asyncHandler");

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

module.exports = router;
