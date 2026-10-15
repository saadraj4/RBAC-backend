import { z } from "zod";

export const registerSchema = z
  .object({
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
    roles: z.array(z.string().trim()).optional(),
  })
  .transform((data) => {
    // Normalize role/roles into a clean array of role names
    let roles = [];
    if (data.roles && Array.isArray(data.roles) && data.roles.length > 0) {
      roles = data.roles;
    } else if (data.role) {
      roles = [data.role];
    } else {
      roles = ["user"];
    }
    return {
      name: data.name,
      email: data.email,
      password: data.password,
      roles,
    };
  });

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Email is required." })
    .trim()
    .email("Invalid email format."),
  password: z
    .string({ required_error: "Password is required." })
    .min(1, "Password is required."),
});

export const refreshSchema = z.object({
  refreshToken: z
    .string({ required_error: "Refresh token is required." })
    .min(1, "Refresh token is required."),
});

export const logoutSchema = z.object({
  refreshToken: z.string().optional(),
});
