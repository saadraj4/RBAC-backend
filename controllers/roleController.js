const roleService = require("../services/roleService");
const { sendSuccess, sendError, paginate } = require("../utils/response");

/** GET /api/roles — list all roles (supports ?page=1&limit=10 or ?all=true) */
async function getRoles(req, res) {
  const totalCount = await roleService.countRoles();
  const { skip, take, pagination } = paginate(req.query, totalCount);

  const { roles } = await roleService.getRoles({ skip, take });

  return sendSuccess(res, { data: roles, pagination });
}

/** GET /api/roles/:id — get single role by id */
async function getRoleById(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return sendError(res, { message: "Invalid role ID.", statusCode: 400 });
  }

  const role = await roleService.findRoleById(id);
  if (!role) {
    return sendError(res, { message: "Role not found.", statusCode: 404 });
  }

  return sendSuccess(res, { data: role });
}

/** POST /api/roles — create a new role */
async function createRole(req, res) {
  const { name } = req.body;

  if (!name || !name.trim()) {
    return sendError(res, { message: "Role name is required.", statusCode: 400 });
  }

  const normalized = name.toLowerCase().trim();

  // Check if active role exists
  const activeRole = await roleService.findRoleByName(normalized);
  if (activeRole) {
    return sendError(res, { message: `Role "${normalized}" already exists.`, statusCode: 409 });
  }

  const role = await roleService.createRole(normalized);
  return sendSuccess(res, { data: role, message: "Role created successfully.", statusCode: 201 });
}

/** PUT /api/roles/:id — update role */
async function updateRole(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return sendError(res, { message: "Invalid role ID.", statusCode: 400 });
  }

  const { name } = req.body;
  if (!name || !name.trim()) {
    return sendError(res, { message: "Role name is required.", statusCode: 400 });
  }

  const role = await roleService.findRoleById(id);
  if (!role) {
    return sendError(res, { message: "Role not found.", statusCode: 404 });
  }

  const normalized = name.toLowerCase().trim();

  // If renaming, check whether another role already has this name
  if (normalized !== role.name) {
    const existingWithSameName = await roleService.findRoleByName(normalized, { includeDeleted: true });
    if (existingWithSameName && existingWithSameName.id !== id) {
      return sendError(res, { message: `Role "${normalized}" already exists.`, statusCode: 409 });
    }
  }

  const updatedRole = await roleService.updateRole(id, { name: normalized });
  return sendSuccess(res, { data: updatedRole, message: "Role updated successfully." });
}

/** DELETE /api/roles/:id — soft delete role */
async function deleteRole(req, res) {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return sendError(res, { message: "Invalid role ID.", statusCode: 400 });
  }

  const role = await roleService.findRoleById(id);
  if (!role) {
    return sendError(res, { message: "Role not found.", statusCode: 404 });
  }

  const softDeletedRole = await roleService.softDeleteRole(id);
  return sendSuccess(res, {
    data: softDeletedRole,
    message: `Role "${role.name}" soft deleted successfully.`,
  });
}

module.exports = {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};
