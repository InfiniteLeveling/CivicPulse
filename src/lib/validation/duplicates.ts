import { z } from "zod";

export const duplicateLatitudeSchema = z
  .number({ message: "Latitude must be a valid number." })
  .refine((n) => Number.isFinite(n), "Latitude must be a finite number.")
  .refine((n) => !Number.isNaN(n), "Latitude cannot be NaN.")
  .min(-90, "Latitude cannot be less than -90 degrees.")
  .max(90, "Latitude cannot exceed 90 degrees.");

export const duplicateLongitudeSchema = z
  .number({ message: "Longitude must be a valid number." })
  .refine((n) => Number.isFinite(n), "Longitude must be a finite number.")
  .refine((n) => !Number.isNaN(n), "Longitude cannot be NaN.")
  .min(-180, "Longitude cannot be less than -180 degrees.")
  .max(180, "Longitude cannot exceed 180 degrees.");

export const duplicateCategoryEnum = z.enum([
  "pothole",
  "garbage",
  "water_leakage",
  "streetlight",
  "drainage",
  "other",
]);

export const duplicateStatusEnum = z.enum(["pending", "in_progress", "resolved"]);

export const duplicateVisibilityEnum = z.enum(["public", "private"]);

export const duplicateCandidateSchema = z.object({
  id: z.string().trim().min(1, "Candidate ID is required."),
  reference: z.string().trim().min(1, "Reference code is required."),
  title: z.string().trim().min(1, "Title is required."),
  category: duplicateCategoryEnum,
  status: duplicateStatusEnum,
  distanceMeters: z
    .number({ message: "Distance must be a valid number." })
    .refine((n) => Number.isFinite(n), "Distance must be finite.")
    .min(0, "Distance cannot be negative."),
  supportCount: z
    .number({ message: "Support count must be a valid integer." })
    .int("Support count must be an integer.")
    .min(0, "Support count cannot be negative."),
  imageUrl: z.string().nullish().transform((val) => val ?? null),
});

export type DuplicateCandidateSchema = z.infer<typeof duplicateCandidateSchema>;

export const duplicateCheckRequestSchema = z.object({
  category: duplicateCategoryEnum,
  latitude: duplicateLatitudeSchema,
  longitude: duplicateLongitudeSchema,
  visibility: duplicateVisibilityEnum,
});

export type DuplicateCheckRequestSchema = z.infer<typeof duplicateCheckRequestSchema>;

export const duplicateCheckResponseSchema = z.object({
  candidates: z.array(duplicateCandidateSchema),
});

export type DuplicateCheckResponseSchema = z.infer<typeof duplicateCheckResponseSchema>;

export function formatDistance(meters: number): string {
  if (typeof meters !== "number" || !Number.isFinite(meters) || meters < 0) {
    return "0m away";
  }
  const rounded = Math.round(meters);
  if (rounded < 1000) {
    return `${rounded}m away`;
  }
  const km = (meters / 1000).toFixed(1);
  return `${km}km away`;
}

export function formatSupportCount(count: number): string {
  if (typeof count !== "number" || !Number.isFinite(count) || count < 0) {
    return "0 supports";
  }
  const rounded = Math.floor(count);
  return `${rounded} ${rounded === 1 ? "support" : "supports"}`;
}

export function validateDuplicateCheckResponse(data: unknown): DuplicateCheckResponseSchema {
  return duplicateCheckResponseSchema.parse(data);
}

export function safeValidateDuplicateCheckResponse(data: unknown) {
  return duplicateCheckResponseSchema.safeParse(data);
}
