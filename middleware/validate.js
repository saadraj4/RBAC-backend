import { sendError } from "../utils/index.js";

/**
 * Reusable Zod validation middleware.
 * Supports passing a ZodSchema directly (defaults to validating req.body)
 * or passing an object specifying targets: { body, params, query }.
 */
export function validate(schema, source = "body") {
  return (req, res, next) => {
    // 1. If schema is a Zod schema object with safeParse
    if (schema && typeof schema.safeParse === "function") {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        const errors = result.error.errors.map((e) => {
          const field = e.path.length ? `${e.path.join(".")}: ` : "";
          return `${field}${e.message}`;
        });
        return sendError(res, {
          message: errors.join(", "),
          statusCode: 400,
          code: "VALIDATION_ERROR",
        });
      }
      req[source] = result.data;
      return next();
    }

    // 2. If an object of schemas was passed: { body: ..., params: ..., query: ... }
    if (schema && typeof schema === "object") {
      for (const [key, subSchema] of Object.entries(schema)) {
        if (subSchema && typeof subSchema.safeParse === "function") {
          const result = subSchema.safeParse(req[key]);
          if (!result.success) {
            const errors = result.error.errors.map((e) => {
              const field = e.path.length ? `${e.path.join(".")}: ` : "";
              return `${field}${e.message}`;
            });
            return sendError(res, {
              message: errors.join(", "),
              statusCode: 400,
              code: "VALIDATION_ERROR",
            });
          }
          req[key] = result.data;
        }
      }
      return next();
    }

    return next();
  };
}
