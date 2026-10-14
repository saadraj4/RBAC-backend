const { Router } = require("express");
const userController = require("../controllers/userController");
const authenticate = require("../middleware/authenticate");
const asyncHandler = require("../utils/asyncHandler");

const router = Router();

// Named action endpoints
router.post("/create", authenticate, asyncHandler(userController.createUser));
router.get("/get-all", authenticate, asyncHandler(userController.getUsers));
router.get("/get/:id", authenticate, asyncHandler(userController.getUserById));
router.put("/update/:id", authenticate, asyncHandler(userController.updateUser));
router.delete("/delete/:id", authenticate, asyncHandler(userController.deleteUser));
router.patch("/status/:id", authenticate, asyncHandler(userController.updateUserStatus));

module.exports = router;
