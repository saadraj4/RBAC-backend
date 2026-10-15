import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { prisma } from "../config/db.js";

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Hash a plaintext password */
export async function hashPassword(password) {
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 10;
  return bcrypt.hash(password, rounds);
}

/** Compare plaintext password against hash */
export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/** SHA-256 hash of a string (used for refresh token storage) */
export function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Format a user with a clean roles array: [{ id, name }, ...] */
export function formatUserRoles(user) {
  if (!user) return null;
  const { userRoles, ...userData } = user;
  const roles = userRoles
    ? userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name }))
    : [];
  return { ...userData, roles };
}

/** Generate an access token containing array of roles */
export function generateAccessToken(user) {
  const roles = user.roles || (user.userRoles
    ? user.userRoles.map((ur) => ({ id: ur.role.id, name: ur.role.name }))
    : []);

  return jwt.sign(
    {
      id: user.id,
      roles,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN }
  );
}

/** Generate a refresh token with a random jti */
export function generateRefreshToken(userId) {
  return jwt.sign(
    { id: userId },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
      jwtid: crypto.randomUUID(),
    }
  );
}

/** Decode a refresh token (verify signature + expiry) */
export function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

/**
 * Persist a refresh token hash in the DB.
 * expiresAt is derived from the JWT's exp claim.
 */
export async function saveRefreshToken(rawToken, userId) {
  const decoded = jwt.decode(rawToken);
  const expiresAt = new Date(decoded.exp * 1000);

  return prisma.refreshToken.create({
    data: {
      tokenHash: sha256(rawToken),
      userId,
      expiresAt,
    },
  });
}

/** Revoke a single refresh token by its hash */
export async function revokeRefreshTokenByHash(tokenHash) {
  return prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

/**
 * Database Transaction: Atomically revoke old refresh token and issue new refresh token.
 * Prevents race conditions and partial failures during token rotation.
 */
export async function rotateRefreshToken(oldTokenHash, rawNewToken, userId) {
  const decoded = jwt.decode(rawNewToken);
  const expiresAt = new Date(decoded.exp * 1000);
  const newTokenHash = sha256(rawNewToken);

  return prisma.$transaction(async (tx) => {
    // 1. Revoke old token
    await tx.refreshToken.updateMany({
      where: { tokenHash: oldTokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // 2. Persist new token
    return tx.refreshToken.create({
      data: {
        tokenHash: newTokenHash,
        userId,
        expiresAt,
      },
    });
  });
}

/**
 * Find a stored refresh token record by its hash.
 * Returns null if not found.
 */
export async function findRefreshToken(tokenHash) {
  return prisma.refreshToken.findUnique({ where: { tokenHash } });
}

// ─── User queries ───────────────────────────────────────────────────────────

/** Find a user by email, including multiple roles */
export async function findUserByEmail(email, { includeDeleted = false } = {}) {
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
  return formatUserRoles(user);
}

/** Find a user by ID, including multiple roles (without passwordHash) */
export async function findUserById(id, { includeDeleted = false } = {}) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return null;

  const user = await prisma.user.findUnique({
    where: { id: numericId },
    include: {
      userRoles: {
        include: { role: true },
      },
    },
  });
  if (!user) return null;
  if (!includeDeleted && user.isDeleted) return null;
  return formatUserRoles(user);
}

/** Create a new user with multiple roles inside a transaction */
export async function createUser({ name, email, passwordHash, roleIds = [] }) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name,
        email,
        passwordHash,
        isDeleted: false,
        userRoles: {
          create: roleIds.map((roleId) => ({ roleId })),
        },
      },
      include: {
        userRoles: {
          include: { role: true },
        },
      },
    });

    return formatUserRoles(user);
  });
}

/** Soft delete a user */
export async function softDeleteUser(userId) {
  const numericId = parseInt(userId, 10);
  return prisma.user.update({
    where: { id: numericId },
    data: { isDeleted: true },
    select: {
      id: true,
      name: true,
      email: true,
      isDeleted: true,
      updatedAt: true,
    },
  });
}

/** Find a role by name (excluding soft deleted) */
export async function findRoleByName(name, { includeDeleted = false } = {}) {
  const role = await prisma.role.findUnique({ where: { name } });
  if (!role) return null;
  if (!includeDeleted && role.isDeleted) return null;
  return role;
}

/** Find multiple roles by array of names */
export async function findRolesByNames(names, { includeDeleted = false } = {}) {
  const normalizedNames = names.map((n) => n.toLowerCase().trim());
  const where = { name: { in: normalizedNames } };
  if (!includeDeleted) where.isDeleted = false;
  return prisma.role.findMany({ where });
}

/** Find multiple roles by array of IDs */
export async function findRolesByIds(ids, { includeDeleted = false } = {}) {
  const where = { id: { in: ids } };
  if (!includeDeleted) where.isDeleted = false;
  return prisma.role.findMany({ where });
}
