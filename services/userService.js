import bcrypt from "bcrypt";
import { prisma } from "../config/db.js";

// Reusable user select object (excludes passwordHash)
export const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  userRoles: {
    select: {
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
  isActive: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
};

/** Normalize user object so that userRoles becomes a clean roles array: [{ id, name }, ...] */
export function formatUser(user) {
  if (!user) return null;
  const { userRoles, ...rest } = user;
  const roles = userRoles ? userRoles.map((ur) => ur.role) : [];
  return { ...rest, roles };
}

/** Get users with pagination and active/deleted filtering */
export async function getUsers({ skip, take, includeDeleted = false, isActive } = {}) {
  const where = {};
  if (!includeDeleted) where.isDeleted = false;
  if (typeof isActive === "boolean") where.isActive = isActive;

  const [rawUsers, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: USER_PUBLIC_SELECT,
    }),
    prisma.user.count({ where }),
  ]);

  return { users: rawUsers.map(formatUser), totalCount };
}

/** Count total active users */
export async function countUsers({ includeDeleted = false, isActive } = {}) {
  const where = {};
  if (!includeDeleted) where.isDeleted = false;
  if (typeof isActive === "boolean") where.isActive = isActive;

  return prisma.user.count({ where });
}

/** Get single user by ID */
export async function getUserById(id, { includeDeleted = false } = {}) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return null;

  const user = await prisma.user.findUnique({
    where: { id: numericId },
    select: USER_PUBLIC_SELECT,
  });

  if (!user) return null;
  if (!includeDeleted && user.isDeleted) return null;
  return formatUser(user);
}

/** Find user by email */
export async function getUserByEmail(email, { includeDeleted = true } = {}) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });

  if (!user) return null;
  if (!includeDeleted && user.isDeleted) return null;

  const { userRoles, ...rest } = user;
  return { ...rest, roles: userRoles ? userRoles.map((ur) => ur.role) : [] };
}

/** Create a new user with multiple roles (inside transaction) */
export async function createUser({
  name,
  email,
  password,
  roleIds = [],
  isActive = true,
}) {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        isActive,
        isDeleted: false,
        userRoles: {
          create: roleIds.map((roleId) => ({ roleId })),
        },
      },
      select: USER_PUBLIC_SELECT,
    });

    return formatUser(user);
  });
}

/** Update user details (name, roleIds, isActive) inside a transaction */
export async function updateUser(id, updateData) {
  const numericId = parseInt(id, 10);
  const { roleIds, ...fieldsToUpdate } = updateData;

  return prisma.$transaction(async (tx) => {
    if (roleIds !== undefined && Array.isArray(roleIds)) {
      // Replace existing roles with new role set
      await tx.userRole.deleteMany({ where: { userId: numericId } });
      if (roleIds.length > 0) {
        await tx.userRole.createMany({
          data: roleIds.map((roleId) => ({ userId: numericId, roleId })),
        });
      }
    }

    if (Object.keys(fieldsToUpdate).length > 0) {
      await tx.user.update({
        where: { id: numericId },
        data: fieldsToUpdate,
      });
    }

    const updated = await tx.user.findUnique({
      where: { id: numericId },
      select: USER_PUBLIC_SELECT,
    });

    return formatUser(updated);
  });
}

/** Update user active/inactive status */
export async function updateUserStatus(id, isActive) {
  const numericId = parseInt(id, 10);
  const user = await prisma.user.update({
    where: { id: numericId },
    data: { isActive },
    select: USER_PUBLIC_SELECT,
  });
  return formatUser(user);
}

/** Soft delete a user */
export async function softDeleteUser(id) {
  const numericId = parseInt(id, 10);
  const user = await prisma.user.update({
    where: { id: numericId },
    data: { isDeleted: true, isActive: false },
    select: USER_PUBLIC_SELECT,
  });
  return formatUser(user);
}
