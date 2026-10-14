const { z } = require("zod");

const registerSchema = z.object({
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
  role: z.string().trim().optional().default("user"),
});

const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .email("Invalid email format."),
  password: z
    .string({ required_error: "Password is required." })
    .min(1, "Password is required."),
});

const refreshSchema = z.object({
  refreshToken: z
    .string({ required_error: "Refresh token is required." })
    .min(1, "Refresh token is required."),
});

const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  refreshSchema,
  logoutSchema,
};
