/**
 * Wraps an async route handler to catch errors and pass them to next().
 */
export default function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
