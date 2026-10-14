const { z } = require("zod");

const createUserSchema = z.object({
  name: z
    .string({ required_error: "Name is required." })
    .trim()
    .min(1, "Name cannot be empty."),
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .email("Invalid email format."),
  password: z
    .string({ required_error: "Password is required." })
    .min(6, "Password must be at least 6 characters."),
  role: z.string().trim().optional(),
  roleId: z.coerce.number().int().positive().optional(),
  isActive: z.boolean().optional().default(true),
});

const updateUserSchema = z
  .object({
    name: z.string().trim().min(1, "Name cannot be empty.").optional(),
    roleId: z.coerce.number().int().positive().optional(),
    role: z.string().trim().min(1).optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (data) => Object.keys(data).length > 0,
    { message: "At least one valid field must be provided to update." }
  );

const userStatusSchema = z.object({
  isActive: z.boolean({
    required_error: "isActive (boolean) is required in request body.",
    invalid_type_error: "isActive must be a boolean (true or false).",
  }),
});

const userIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "User ID must be a valid numeric integer.")
    .transform((val) => parseInt(val, 10)),
});

module.exports = {
  createUserSchema,
  updateUserSchema,
  userStatusSchema,
  userIdParamSchema,
};
