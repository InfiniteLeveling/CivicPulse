import { z } from "zod";

export const latitudeSchema = z
  .number({ message: "Latitude must be a valid number." })
  .refine((n) => Number.isFinite(n), "Latitude must be a finite number.")
  .refine((n) => !Number.isNaN(n), "Latitude cannot be NaN.")
  .min(-90, "Latitude cannot be less than -90 degrees.")
  .max(90, "Latitude cannot exceed 90 degrees.");

export const longitudeSchema = z
  .number({ message: "Longitude must be a valid number." })
  .refine((n) => Number.isFinite(n), "Longitude must be a finite number.")
  .refine((n) => !Number.isNaN(n), "Longitude cannot be NaN.")
  .min(-180, "Longitude cannot be less than -180 degrees.")
  .max(180, "Longitude cannot exceed 180 degrees.");

export const locationSourceEnum = z.enum(["gps", "map", "manual"]);

export const locationSelectionSchema = z.object({
  latitude: latitudeSchema,
  longitude: longitudeSchema,
  source: locationSourceEnum,
  accuracyMeters: z.number().finite().positive().optional(),
  confirmed: z.boolean(),
});

export type LocationSelectionSchema = z.infer<typeof locationSelectionSchema>;

export interface CoordinateValidationResult {
  valid: boolean;
  errors: {
    latitude: string | null;
    longitude: string | null;
  };
}

export function validateCoordinates(lat: unknown, lng: unknown): CoordinateValidationResult {
  const latNum = typeof lat === "string" ? Number(lat) : lat;
  const lngNum = typeof lng === "string" ? Number(lng) : lng;

  const latRes = latitudeSchema.safeParse(latNum);
  const lngRes = longitudeSchema.safeParse(lngNum);

  return {
    valid: latRes.success && lngRes.success,
    errors: {
      latitude: latRes.success ? null : latRes.error.issues[0]?.message ?? "Invalid latitude",
      longitude: lngRes.success ? null : lngRes.error.issues[0]?.message ?? "Invalid longitude",
    },
  };
}

export function formatCoordinate(val: number | null | undefined, precision = 5): string {
  if (typeof val !== "number" || !Number.isFinite(val)) return "";
  return val.toFixed(precision);
}
