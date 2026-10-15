import { userService, roleService } from "../services/index.js";
import { sendSuccess, paginate } from "../utils/index.js";
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
} from "../errors/index.js";

/** POST /api/users/create — create a new user */
export async function createUser(req, res) {
  const { name, email, password, roleIds: inputRoleIds, roles: inputRoles, isActive = true } = req.body;

  // 1. Resolve role IDs
  let targetRoleIds = [];
  if (inputRoleIds && inputRoleIds.length > 0) {
    const foundRoles = await roleService.findRolesByIds(inputRoleIds);
    if (foundRoles.length !== inputRoleIds.length) {
      throw new BadRequestError("One or more specified role IDs do not exist.");
    }
    targetRoleIds = foundRoles.map((r) => r.id);
  } else if (inputRoles && inputRoles.length > 0) {
    const foundRoles = await roleService.findRolesByNames(inputRoles);
    if (foundRoles.length !== inputRoles.length) {
      const foundNames = foundRoles.map((r) => r.name);
      const missing = inputRoles.filter(
        (r) => !foundNames.includes(r.toLowerCase().trim())
      );
      throw new BadRequestError(`Role(s) not found: ${missing.join(", ")}`);
    }
    targetRoleIds = foundRoles.map((r) => r.id);
  } else {
    const defaultRole = await roleService.findRoleByName("user");
    if (defaultRole) targetRoleIds = [defaultRole.id];
  }

  // 2. Check duplicate email
  const existingUser = await userService.getUserByEmail(email.toLowerCase().trim(), {
    includeDeleted: true,
  });
  if (existingUser) {
    throw new ConflictError("Email is already registered.");
  }

  // 3. Create user
  const user = await userService.createUser({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    roleIds: targetRoleIds,
    isActive,
  });

  return sendSuccess(res, {
    data: user,
    message: "User created successfully.",
    statusCode: 201,
  });
}

/** GET /api/users/get-all — get users (supports ?page=1&limit=10 or ?all=true and ?isActive=true/false) */
export async function getUsers(req, res) {
  let isActive;
  if (req.query.isActive === "true") isActive = true;
  if (req.query.isActive === "false") isActive = false;

  const totalCount = await userService.countUsers({ isActive });
  const { skip, take, pagination } = paginate(req.query, totalCount);

  const { users } = await userService.getUsers({ skip, take, isActive });
  return sendSuccess(res, { data: users, pagination });
}

/** GET /api/users/get/:id — get user by id */
export async function getUserById(req, res) {
  const { id } = req.params;

  const user = await userService.getUserById(id);
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  return sendSuccess(res, { data: user });
}

/** PUT /api/users/update/:id — update user */
export async function updateUser(req, res) {
  const { id } = req.params;
  const { name, roleId, roleIds: inputRoleIds, role, roles: inputRoles, isActive } = req.body;

  const user = await userService.getUserById(id);
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  const updateData = {};
  if (name && name.trim()) {
    updateData.name = name.trim();
  }

  // Resolve updated role IDs if provided
  const combinedIds = inputRoleIds || (roleId ? [roleId] : undefined);
  const combinedNames = inputRoles || (role ? [role] : undefined);

  if (combinedIds && combinedIds.length > 0) {
    const foundRoles = await roleService.findRolesByIds(combinedIds);
    if (foundRoles.length !== combinedIds.length) {
      throw new BadRequestError("One or more specified role IDs do not exist.");
    }
    updateData.roleIds = foundRoles.map((r) => r.id);
  } else if (combinedNames && combinedNames.length > 0) {
    const foundRoles = await roleService.findRolesByNames(combinedNames);
    if (foundRoles.length !== combinedNames.length) {
      const foundNames = foundRoles.map((r) => r.name);
      const missing = combinedNames.filter(
        (r) => !foundNames.includes(r.toLowerCase().trim())
      );
      throw new BadRequestError(`Role(s) not found: ${missing.join(", ")}`);
    }
    updateData.roleIds = foundRoles.map((r) => r.id);
  }

  if (typeof isActive === "boolean") {
    updateData.isActive = isActive;
  }

  const updatedUser = await userService.updateUser(id, updateData);
  return sendSuccess(res, {
    data: updatedUser,
    message: "User updated successfully.",
  });
}

/** PATCH /api/users/status/:id — toggle or set active/inactive status */
export async function updateUserStatus(req, res) {
  const { id } = req.params;
  const { isActive } = req.body;

  const user = await userService.getUserById(id);
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  const updatedUser = await userService.updateUserStatus(id, isActive);
  const statusLabel = isActive ? "activated" : "deactivated";

  return sendSuccess(res, {
    data: updatedUser,
    message: `User ${statusLabel} successfully.`,
  });
}

/** DELETE /api/users/delete/:id — soft delete user */
export async function deleteUser(req, res) {
  const { id } = req.params;

  const user = await userService.getUserById(id);
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  const softDeletedUser = await userService.softDeleteUser(id);
  return sendSuccess(res, {
    data: softDeletedUser,
    message: `User "${user.name}" soft deleted successfully.`,
  });
}
