const { Router } = require("express");
const roleController = require("../controllers/roleController");
const authenticate = require("../middleware/authenticate");
const asyncHandler = require("../utils/asyncHandler");

const router = Router();

// Named action endpoints
router.get("/get-all", authenticate, asyncHandler(roleController.getRoles));
router.get("/get/:id", authenticate, asyncHandler(roleController.getRoleById));
router.post("/create", authenticate, asyncHandler(roleController.createRole));
router.put("/update/:id", authenticate, asyncHandler(roleController.updateRole));
router.delete("/delete/:id", authenticate, asyncHandler(roleController.deleteRole));

module.exports = router;
