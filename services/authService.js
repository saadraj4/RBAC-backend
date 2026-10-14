const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const prisma = require("../config/db");

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Hash a plaintext password */
async function hashPassword(password) {
  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10);
  return bcrypt.hash(password, rounds);
}

/** Compare plaintext password against hash */
async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

/** SHA-256 hash of a string (used for refresh token storage) */
function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/** Generate an access token */
function generateAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: { id: user.role.id, name: user.role.name },
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN }
  );
}

/** Generate a refresh token with a random jti */
function generateRefreshToken(userId) {
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
function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

/**
 * Persist a refresh token hash in the DB.
 * expiresAt is derived from the JWT's exp claim.
 */
async function saveRefreshToken(rawToken, userId) {
  const decoded = jwt.decode(rawToken);
  const expiresAt = new Date(decoded.exp * 1000);

  await prisma.refreshToken.create({
    data: {
      tokenHash: sha256(rawToken),
      userId,
      expiresAt,
    },
  });
}

/** Revoke a single refresh token by its hash */
async function revokeRefreshTokenByHash(tokenHash) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}



/**
 * Find a stored refresh token record by its hash.
 * Returns null if not found.
 */
async function findRefreshToken(tokenHash) {
  return prisma.refreshToken.findUnique({ where: { tokenHash } });
}

// ─── User queries ───────────────────────────────────────────────────────────

/** Find a user by email, including role */
async function findUserByEmail(email, { includeDeleted = false } = {}) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: { role: true },
  });
  if (!user) return null;
  if (!includeDeleted && user.isDeleted) return null;
  return user;
}

/** Find a user by ID, including role (without passwordHash) */
async function findUserById(id, { includeDeleted = false } = {}) {
  const numericId = parseInt(id, 10);
  if (isNaN(numericId)) return null;

  const user = await prisma.user.findUnique({
    where: { id: numericId },
    include: { role: true },
  });
  if (!user) return null;
  if (!includeDeleted && user.isDeleted) return null;
  return user;
}

/** Create a new user */
async function createUser({ name, email, passwordHash, roleId }) {
  return prisma.user.create({
    data: { name, email, passwordHash, roleId, isDeleted: false },
    include: { role: true },
  });
}

/** Soft delete a user */
async function softDeleteUser(userId) {
  return prisma.user.update({
    where: { id: userId },
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
async function findRoleByName(name, { includeDeleted = false } = {}) {
  const role = await prisma.role.findUnique({ where: { name } });
  if (!role) return null;
  if (!includeDeleted && role.isDeleted) return null;
  return role;
}

module.exports = {
  hashPassword,
  comparePassword,
  sha256,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  saveRefreshToken,
  revokeRefreshTokenByHash,
  findRefreshToken,
  findUserByEmail,
  findUserById,
  createUser,
  softDeleteUser,
  findRoleByName,
};
