import { authService } from "../services/index.js";
import { sendSuccess } from "../utils/index.js";
import {
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
} from "../errors/index.js";

/** POST /api/auth/register */
export async function register(req, res) {
  const { name, email, password, roles: requestedRoles = ["user"] } = req.body;

  // 1. Resolve and validate all requested roles
  const foundRoles = await authService.findRolesByNames(requestedRoles);
  if (foundRoles.length !== requestedRoles.length) {
    const foundNames = foundRoles.map((r) => r.name);
    const missing = requestedRoles.filter(
      (r) => !foundNames.includes(r.toLowerCase().trim())
    );
    throw new BadRequestError(`Role(s) not found: ${missing.join(", ")}`);
  }

  // 2. Check duplicate email
  const existing = await authService.findUserByEmail(email.toLowerCase().trim(), {
    includeDeleted: true,
  });
  if (existing) {
    throw new ConflictError("Email is already registered.");
  }

  // 3. Create user with associated roles
  const passwordHash = await authService.hashPassword(password);
  const user = await authService.createUser({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    roleIds: foundRoles.map((r) => r.id),
  });

  const { passwordHash: _, ...userResponse } = user;

  return sendSuccess(res, {
    data: { user: userResponse },
    message: "User registered successfully.",
    statusCode: 201,
  });
}

/** POST /api/auth/login */
export async function login(req, res) {
  const { email, password } = req.body;

  const user = await authService.findUserByEmail(email.toLowerCase().trim());
  if (!user) {
    throw new UnauthorizedError("Invalid credentials.");
  }

  const valid = await authService.comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError("Invalid credentials.");
  }

  if (user.isActive === false) {
    throw new ForbiddenError(
      "Account is inactive. Please contact administrator.",
      "ACCOUNT_INACTIVE"
    );
  }

  const accessToken = authService.generateAccessToken(user);
  const refreshToken = authService.generateRefreshToken(user.id);
  await authService.saveRefreshToken(refreshToken, user.id);

  const { passwordHash: _, ...userResponse } = user;

  return sendSuccess(res, {
    data: { accessToken, refreshToken, user: userResponse },
    message: "Logged in successfully.",
  });
}

/** POST /api/auth/refresh */
export async function refresh(req, res) {
  const { refreshToken } = req.body;

  // Verify JWT signature and expiry
  let decoded;
  try {
    decoded = authService.verifyRefreshToken(refreshToken);
  } catch (err) {
    throw new UnauthorizedError("Invalid or expired refresh token.");
  }

  const tokenHash = authService.sha256(refreshToken);
  const storedToken = await authService.findRefreshToken(tokenHash);

  if (!storedToken) {
    throw new UnauthorizedError("Refresh token not recognized.");
  }

  // If already revoked, reject
  if (storedToken.revokedAt) {
    throw new UnauthorizedError("Refresh token has been revoked.", "TOKEN_REVOKED");
  }

  // Check DB expiry
  if (storedToken.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token has expired.");
  }

  const user = await authService.findUserById(decoded.id);
  if (!user) {
    throw new UnauthorizedError("User not found or token invalid.");
  }

  if (user.isActive === false) {
    throw new ForbiddenError("Account is inactive.", "ACCOUNT_INACTIVE");
  }

  // Rotation inside DB transaction: atomically revokes old and saves new
  const newAccessToken = authService.generateAccessToken(user);
  const newRefreshToken = authService.generateRefreshToken(user.id);
  await authService.rotateRefreshToken(tokenHash, newRefreshToken, user.id);

  return sendSuccess(res, {
    data: { accessToken: newAccessToken, refreshToken: newRefreshToken },
    message: "Tokens refreshed successfully.",
  });
}

/** POST /api/auth/logout */
export async function logout(req, res) {
  const { refreshToken } = req.body;

  if (refreshToken) {
    const tokenHash = authService.sha256(refreshToken);
    await authService.revokeRefreshTokenByHash(tokenHash);
  }

  return sendSuccess(res, { message: "Logged out successfully." });
}

/** GET /api/auth/me (protected) */
export async function me(req, res) {
  const user = await authService.findUserById(req.user.id);
  if (!user) {
    throw new NotFoundError("User not found.");
  }

  return sendSuccess(res, {
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles,
      isActive: user.isActive,
    },
  });
}
