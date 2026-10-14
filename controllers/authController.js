import { authService } from "../services/index.js";
import { sendSuccess, sendError } from "../utils/index.js";

/** POST /api/auth/register */
export async function register(req, res) {
  const { name, email, password, role: roleName = "user" } = req.body;

  // Check role exists
  const role = await authService.findRoleByName(roleName.toLowerCase().trim());
  if (!role) {
    return sendError(res, { message: `Role "${roleName}" does not exist.`, statusCode: 400 });
  }

  // Check duplicate email
  const existing = await authService.findUserByEmail(email.toLowerCase().trim(), { includeDeleted: true });
  if (existing) {
    return sendError(res, { message: "Email is already registered.", statusCode: 409 });
  }

  const passwordHash = await authService.hashPassword(password);
  const user = await authService.createUser({
    name: name.trim(),
    email: email.toLowerCase().trim(),
    passwordHash,
    roleId: role.id,
  });

  // Strip passwordHash and roleId from response
  const { passwordHash: _, roleId: __, ...userResponse } = user;

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
    return sendError(res, { message: "Invalid credentials.", statusCode: 401 });
  }

  const valid = await authService.comparePassword(password, user.passwordHash);
  if (!valid) {
    return sendError(res, { message: "Invalid credentials.", statusCode: 401 });
  }

  if (user.isActive === false) {
    return sendError(res, {
      message: "Account is inactive. Please contact administrator.",
      statusCode: 403,
      code: "ACCOUNT_INACTIVE",
    });
  }

  const accessToken = authService.generateAccessToken(user);
  const refreshToken = authService.generateRefreshToken(user.id);
  await authService.saveRefreshToken(refreshToken, user.id);

  const { passwordHash: _, roleId: __, ...userResponse } = user;

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
    return sendError(res, { message: "Invalid or expired refresh token.", statusCode: 401 });
  }

  const tokenHash = authService.sha256(refreshToken);
  const storedToken = await authService.findRefreshToken(tokenHash);

  if (!storedToken) {
    return sendError(res, { message: "Refresh token not recognized.", statusCode: 401 });
  }

  // If already revoked, return 401
  if (storedToken.revokedAt) {
    return sendError(res, {
      message: "Refresh token has been revoked.",
      statusCode: 401,
      code: "TOKEN_REVOKED",
    });
  }

  // Check DB expiry
  if (storedToken.expiresAt < new Date()) {
    return sendError(res, { message: "Refresh token has expired.", statusCode: 401 });
  }

  const user = await authService.findUserById(decoded.id);
  if (!user) {
    return sendError(res, { message: "User not found or token invalid.", statusCode: 401 });
  }

  if (user.isActive === false) {
    return sendError(res, {
      message: "Account is inactive.",
      statusCode: 403,
      code: "ACCOUNT_INACTIVE",
    });
  }

  // Rotation: revoke the old token, issue new pair
  await authService.revokeRefreshTokenByHash(tokenHash);

  const newAccessToken = authService.generateAccessToken(user);
  const newRefreshToken = authService.generateRefreshToken(user.id);
  await authService.saveRefreshToken(newRefreshToken, user.id);

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

  // Always return success
  return sendSuccess(res, { message: "Logged out successfully." });
}

/** GET /api/auth/me (protected) */
export async function me(req, res) {
  const user = await authService.findUserById(req.user.id);
  if (!user) {
    return sendError(res, { message: "User not found.", statusCode: 404 });
  }

  return sendSuccess(res, {
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      isActive: user.isActive,
    },
  });
}

export default { register, login, refresh, logout, me };
