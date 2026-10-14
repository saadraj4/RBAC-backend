/**
 * Centralized response helpers for consistent JSON responses.
 */

/**
 * Send a success response.
 * @param {import('express').Response} res
 * @param {object} options - { data, message, statusCode, pagination, meta }
 */
function sendSuccess(res, { data = null, message = "Success", statusCode = 200, pagination = null, meta = null } = {}) {
  const body = { success: true, message };
  if (data !== null) body.data = data;

  const paginationData = pagination !== null ? pagination : meta;
  if (paginationData !== null) body.pagination = paginationData;

  return res.status(statusCode).json(body);
}

/**
 * Send an error response.
 * @param {import('express').Response} res
 * @param {object} options - { message, statusCode, code }
 */
function sendError(res, { message = "Something went wrong", statusCode = 500, code = null } = {}) {
  const body = { success: false, message };
  if (code) body.code = code;
  return res.status(statusCode).json(body);
}

/**
 * Build pagination info from query params.
 * If `all=true` is passed, returns null (no pagination).
 * @param {object} query - req.query
 * @param {number} totalCount - total items in DB
 * @returns {{ skip: number, take: number, pagination: object, meta: object } | { skip: undefined, take: undefined, pagination: null, meta: null }}
 */
function paginate(query, totalCount) {
  if (query.all === "true") {
    return { skip: undefined, take: undefined, pagination: null, meta: null };
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 100);
  const totalPages = Math.ceil(totalCount / limit);

  const paginationInfo = {
    page,
    limit,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };

  return {
    skip: (page - 1) * limit,
    take: limit,
    pagination: paginationInfo,
    meta: paginationInfo,
  };
}

module.exports = { sendSuccess, sendError, paginate };
