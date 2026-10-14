const userService = require("../services/userService");
const roleService = require("../services/roleService");
const authService = require("../services/authService");
const { sendSuccess, sendError, paginate } = require("../utils/response");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** POST /api/users/create — create a new user */
async function createUser(req, res) {
  const { name, email, password, role: roleInput, roleId, isActive = true } = req.body;

  if (!name || !email || !password) {
    return sendError(res, {
      message: "Name, email, and password are required.",
      statusCode: 400,
    });
  }

  if (!EMAIL_RE.test(email)) {
    return sendError(res, { message: "Invalid email format.", statusCode: 400 });
  }

  if (password.length < 6) {
    return sendError(res, {
      message: "Password must be at least 6 characters.",
      statusCode: 400,
    });
  }

  // Resolve role by roleId or role name (defaults to "user")
  let targetRoleId;
  if (roleId !== undefined) {
    const parsedRoleId = parseInt(roleId, 10);
    const role = await roleService.findRoleById(parsedRoleId);
    if (!role) {
      return sendError(res, { message: "Role does not exist.", statusCode: 400 });
    }
    targetRoleId = parsedRoleId;
  } else {
    const roleName = (roleInput).toLowerCase().trim();
    const role = await roleService.findRoleByName(roleName);
    if (!role) {
      return sendError(res, { message: `Role "${roleName}" does not exist.`, statusCode: 400 });
    }
    targetRoleId = role.id;
  }

  // Check duplicate email
  const existingUser = await userService.getUserByEmail(email.toLowerCase().trim(), {
    includeDeleted: true,
  });
  if (existingUser) {
    return sendError(res, { message: "Email is already registered.", statusCode: 409 });
  }

  const user = await userService.createUser({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    roleId: targetRoleId,
    isActive: typeof isActive === "boolean" ? isActive : true,
  });

  return sendSuccess(res, {
    data: user,
    message: "User created successfully.",
    statusCode: 201,
  });
}

/** GET /api/users/get-all — get users (supports ?page=1&limit=10 or ?all=true and ?isActive=true/false) */
async function getUsers(req, res) {
  let isActive;
  if (req.query.isActive === "true") isActive = true;
  if (req.query.isActive === "false") isActive = false;

  const totalCount = await userService.countUsers({ isActive });
  const { skip, take, pagination } = paginate(req.query, totalCount);

  const { users } = await userService.getUsers({ skip, take, isActive });
  return sendSuccess(res, { data: users, pagination });
}

/** GET /api/users/get/:id — get user by id */
async function getUserById(req, res) {
  const { id } = req.params;

  const user = await userService.getUserById(id);
  if (!user) {
    return sendError(res, { message: "User not found.", statusCode: 404 });
  }

  return sendSuccess(res, { data: user });
}

/** PUT /api/users/update/:id — update user */
async function updateUser(req, res) {
  const { id } = req.params;
  const { name, roleId, role: roleInput, isActive } = req.body;

  const user = await userService.getUserById(id);
  if (!user) {
    return sendError(res, { message: "User not found.", statusCode: 404 });
  }

  const updateData = {};
  if (name && typeof name === "string" && name.trim()) {
    updateData.name = name.trim();
  }

  if (roleId !== undefined) {
    const parsedRoleId = parseInt(roleId, 10);
    if (isNaN(parsedRoleId)) {
      return sendError(res, { message: "Invalid role ID.", statusCode: 400 });
    }
    const role = await roleService.findRoleById(parsedRoleId);
    if (!role) {
      return sendError(res, { message: "Role does not exist.", statusCode: 400 });
    }
    updateData.roleId = parsedRoleId;
  } else if (roleInput && typeof roleInput === "string") {
    const role = await roleService.findRoleByName(roleInput.toLowerCase().trim());
    if (!role) {
      return sendError(res, { message: `Role "${roleInput}" does not exist.`, statusCode: 400 });
    }
    updateData.roleId = role.id;
  }

  if (typeof isActive === "boolean") {
    updateData.isActive = isActive;
  }

  if (Object.keys(updateData).length === 0) {
    return sendError(res, { message: "No valid fields provided to update.", statusCode: 400 });
  }

  const updatedUser = await userService.updateUser(id, updateData);
  return sendSuccess(res, {
    data: updatedUser,
    message: "User updated successfully.",
  });
}

/** PATCH /api/users/status/:id — toggle or set active/inactive status */
async function updateUserStatus(req, res) {
  const { id } = req.params;
  const { isActive } = req.body;

  if (typeof isActive !== "boolean") {
    return sendError(res, {
      message: "isActive (boolean) is required in request body.",
      statusCode: 400,
    });
  }

  const user = await userService.getUserById(id);
  if (!user) {
    return sendError(res, { message: "User not found.", statusCode: 404 });
  }

  const updatedUser = await userService.updateUserStatus(id, isActive);
  const statusLabel = isActive ? "activated" : "deactivated";

  return sendSuccess(res, {
    data: updatedUser,
    message: `User ${statusLabel} successfully.`,
  });
}

/** DELETE /api/users/delete/:id — soft delete user */
async function deleteUser(req, res) {
  const { id } = req.params;

  const user = await userService.getUserById(id);
  if (!user) {
    return sendError(res, { message: "User not found.", statusCode: 404 });
  }

  const softDeletedUser = await userService.softDeleteUser(id);
  return sendSuccess(res, {
    data: softDeletedUser,
    message: `User "${user.name}" soft deleted successfully.`,
  });
}

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
};
