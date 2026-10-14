const prisma = require("../config/db");

/** Get all roles (paginated or all, excluding soft deleted by default) */
async function getRoles({ skip, take, includeDeleted = false } = {}) {
  const where = includeDeleted ? {} : { isDeleted: false };
  const [roles, totalCount] = await Promise.all([
    prisma.role.findMany({
      where,
      skip,
      take,
      orderBy: { id: "asc" },
    }),
    prisma.role.count({ where }),
  ]);
  return { roles, totalCount };
}

/** Get total roles count */
async function countRoles({ includeDeleted = false } = {}) {
  const where = includeDeleted ? {} : { isDeleted: false };
  return prisma.role.count({ where });
}

/** Find a role by ID */
async function findRoleById(id, { includeDeleted = false } = {}) {
  const role = await prisma.role.findUnique({ where: { id } });
  if (!role) return null;
  if (!includeDeleted && role.isDeleted) return null;
  return role;
}

/** Find a role by name */
async function findRoleByName(name, { includeDeleted = false } = {}) {
  const role = await prisma.role.findUnique({ where: { name } });
  if (!role) return null;
  if (!includeDeleted && role.isDeleted) return null;
  return role;
}

/** Create or reactivate a role */
async function createRole(name) {
  const existing = await prisma.role.findUnique({ where: { name } });
  if (existing) {
    if (existing.isDeleted) {
      // Reactivate previously soft-deleted role
      return prisma.role.update({
        where: { id: existing.id },
        data: { isDeleted: false },
      });
    }
    // Already active role
    return null;
  }

  return prisma.role.create({
    data: { name, isDeleted: false },
  });
}

/** Update an existing role */
async function updateRole(id, { name }) {
  return prisma.role.update({
    where: { id },
    data: { name },
  });
}

/** Soft delete a role */
async function softDeleteRole(id) {
  return prisma.role.update({
    where: { id },
    data: { isDeleted: true },
  });
}

module.exports = {
  getRoles,
  countRoles,
  findRoleById,
  findRoleByName,
  createRole,
  updateRole,
  softDeleteRole,
};
