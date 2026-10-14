import prisma from "../config/db.js";

/** Get all roles (paginated or all, excluding soft deleted by default) */
export async function getRoles({ skip, take, includeDeleted = false } = {}) {
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
export async function countRoles({ includeDeleted = false } = {}) {
  const where = includeDeleted ? {} : { isDeleted: false };
  return prisma.role.count({ where });
}

/** Find a role by ID */
export async function findRoleById(id, { includeDeleted = false } = {}) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return null;

  const role = await prisma.role.findUnique({ where: { id: numericId } });
  if (!role) return null;
  if (!includeDeleted && role.isDeleted) return null;
  return role;
}

/** Find a role by name */
export async function findRoleByName(name, { includeDeleted = false } = {}) {
  const role = await prisma.role.findUnique({ where: { name } });
  if (!role) return null;
  if (!includeDeleted && role.isDeleted) return null;
  return role;
}

/** Create or reactivate a role */
export async function createRole(name) {
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
export async function updateRole(id, { name }) {
  const numericId = parseInt(id, 10);
  return prisma.role.update({
    where: { id: numericId },
    data: { name },
  });
}

/** Soft delete a role */
export async function softDeleteRole(id) {
  const numericId = parseInt(id, 10);
  return prisma.role.update({
    where: { id: numericId },
    data: { isDeleted: true },
  });
}

export default {
  getRoles,
  countRoles,
  findRoleById,
  findRoleByName,
  createRole,
  updateRole,
  softDeleteRole,
};
