import { z } from "zod";

/**
 * Validates citizen registration input.
 * Strips any user-provided role to prevent privilege escalation.
 * Rejects leading/trailing whitespace matching database check constraint profiles_name_valid.
 */
export const registerSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address").max(255),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100, "Password must not exceed 100 characters"),
  full_name: z
    .string()
    .min(1, "Full name is required")
    .max(120, "Full name must not exceed 120 characters")
    .refine((val) => !/^\s|\s$/.test(val), "Full name cannot have leading or trailing whitespace"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Validates login input.
 */
export const loginSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

/**
 * Validates password recovery request.
 */
export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Please provide a valid email address"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/**
 * Validates password reset update.
 */
export const resetPasswordSchema = z.object({
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long")
    .max(100, "Password must not exceed 100 characters"),
});

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/**
 * Validates profile update (full_name only; role updates from clients are forbidden).
 */
export const updateProfileSchema = z.object({
  full_name: z
    .string()
    .min(1, "Full name is required")
    .max(120, "Full name must not exceed 120 characters")
    .refine((val) => !/^\s|\s$/.test(val), "Full name cannot have leading or trailing whitespace"),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
