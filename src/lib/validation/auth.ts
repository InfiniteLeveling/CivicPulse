import { z } from "zod";

/**
 * Validation schema for the citizen and admin login form.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email address is required.")
    .email("Please enter a valid email address.")
    .max(255, "Email address cannot exceed 255 characters.")
    .trim(),
  password: z
    .string()
    .min(1, "Password is required.")
    .max(128, "Password cannot exceed 128 characters."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Validation schema for public citizen account registration.
 * Role selection is strictly prohibited on public registration.
 */
export const registerSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Full name is required.")
      .min(2, "Full name must be at least 2 characters.")
      .max(100, "Full name cannot exceed 100 characters.")
      .regex(
        /^[a-zA-Z\s'-]+$/,
        "Name should only contain letters, spaces, hyphens, and apostrophes."
      )
      .trim(),
    email: z
      .string()
      .min(1, "Email address is required.")
      .email("Please enter a valid email address.")
      .max(255, "Email address cannot exceed 255 characters.")
      .trim(),
    password: z
      .string()
      .min(1, "Password is required.")
      .min(8, "Password must be at least 8 characters long.")
      .max(128, "Password cannot exceed 128 characters."),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;
