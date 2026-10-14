const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/response");

/**
 * Authenticate middleware — verifies the access token from the Authorization header.
 * Sets req.user = { id, role: { id, name } } on success.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendError(res, {
      message: "Authentication required. No token provided.",
      statusCode: 401,
      code: "NO_TOKEN",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role, // { id, name }
    };
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return sendError(res, {
        message: "Token has expired. Please refresh your token.",
        statusCode: 401,
        code: "TOKEN_EXPIRED",
      });
    }
    return sendError(res, {
      message: "Invalid token.",
      statusCode: 401,
      code: "INVALID_TOKEN",
    });
  }
}

module.exports = authenticate;
