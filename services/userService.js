const bcrypt = require("bcrypt");
const prisma = require("../config/db");

// Reusable user select object (excludes passwordHash)
const USER_PUBLIC_SELECT = {
  id: true,
  name: true,
  email: true,
  role: {
    select: {
      id: true,
      name: true,
    },
  },
  isActive: true,
  isDeleted: true,
  createdAt: true,
  updatedAt: true,
};

/** Get users with pagination and active/deleted filtering */
async function getUsers({ skip, take, includeDeleted = false, isActive } = {}) {
  const where = {};
  if (!includeDeleted) where.isDeleted = false;
  if (typeof isActive === "boolean") where.isActive = isActive;

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: "desc" },
      select: USER_PUBLIC_SELECT,
    }),
    prisma.user.count({ where }),
  ]);

  return { users, totalCount };
}

/** Count total active users */
async function countUsers({ includeDeleted = false, isActive } = {}) {
  const where = {};
  if (!includeDeleted) where.isDeleted = false;
  if (typeof isActive === "boolean") where.isActive = isActive;

  return prisma.user.count({ where });
}

/** Get single user by ID */
async function getUserById(id, { includeDeleted = false } = {}) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return null;

  const user = await prisma.user.findUnique({
    where: { id: numericId },
    select: USER_PUBLIC_SELECT,
  });

  if (!user) return null;
  if (!includeDeleted && user.isDeleted) return null;
  return user;
}

/** Find user by email */
async function getUserByEmail(email, { includeDeleted = true } = {}) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });

  if (!user) return null;
  if (!includeDeleted && user.isDeleted) return null;
  return user;
}

/** Create a new user (with password hashing) */
async function createUser({ name, email, password, roleId, isActive = true }) {
  const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
  const passwordHash = await bcrypt.hash(password, saltRounds);

  return prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      roleId,
      isActive,
      isDeleted: false,
    },
    select: USER_PUBLIC_SELECT,
  });
}

/** Update user details (name, roleId, isActive) */
async function updateUser(id, updateData) {
  const numericId = parseInt(id, 10);
  return prisma.user.update({
    where: { id: numericId },
    data: updateData,
    select: USER_PUBLIC_SELECT,
  });
}

/** Update user active/inactive status */
async function updateUserStatus(id, isActive) {
  const numericId = parseInt(id, 10);
  return prisma.user.update({
    where: { id: numericId },
    data: { isActive },
    select: USER_PUBLIC_SELECT,
  });
}

/** Soft delete a user */
async function softDeleteUser(id) {
  const numericId = parseInt(id, 10);
  return prisma.user.update({
    where: { id: numericId },
    data: { isDeleted: true, isActive: false },
    select: USER_PUBLIC_SELECT,
  });
}

module.exports = {
  getUsers,
  countUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  updateUserStatus,
  softDeleteUser,
};
