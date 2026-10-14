import { z } from "zod";

export const createRoleSchema = z.object({
  name: z
    .string({ required_error: "Role name is required." })
    .trim()
    .min(1, "Role name is required."),
});

export const updateRoleSchema = z.object({
  name: z
    .string({ required_error: "Role name is required." })
    .trim()
    .min(1, "Role name is required."),
});

export const roleIdParamSchema = z.object({
  id: z
    .string()
    .regex(/^\d+$/, "Role ID must be a valid numeric integer.")
    .transform((val) => parseInt(val, 10)),
});

export default {
  createRoleSchema,
  updateRoleSchema,
  roleIdParamSchema,
};
