import { roleService } from "../services/index.js";
import { sendSuccess, sendError, paginate } from "../utils/index.js";

/** GET /api/roles/get-all — list all roles (supports ?page=1&limit=10 or ?all=true) */
export async function getRoles(req, res) {
  const totalCount = await roleService.countRoles();
  const { skip, take, pagination } = paginate(req.query, totalCount);

  const { roles } = await roleService.getRoles({ skip, take });

  return sendSuccess(res, { data: roles, pagination });
}

/** GET /api/roles/get/:id — get single role by id */
export async function getRoleById(req, res) {
  const { id } = req.params;

  const role = await roleService.findRoleById(id);
  if (!role) {
    return sendError(res, { message: "Role not found.", statusCode: 404 });
  }

  return sendSuccess(res, { data: role });
}

/** POST /api/roles/create — create a new role */
export async function createRole(req, res) {
  const { name } = req.body;
  const normalized = name.toLowerCase().trim();

  // Check if active role exists
  const activeRole = await roleService.findRoleByName(normalized);
  if (activeRole) {
    return sendError(res, { message: `Role "${normalized}" already exists.`, statusCode: 409 });
  }

  const role = await roleService.createRole(normalized);
  return sendSuccess(res, { data: role, message: "Role created successfully.", statusCode: 201 });
}

/** PUT /api/roles/update/:id — update role */
export async function updateRole(req, res) {
  const { id } = req.params;
  const { name } = req.body;

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

/** DELETE /api/roles/delete/:id — soft delete role */
export async function deleteRole(req, res) {
  const { id } = req.params;

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

export default {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
};
