import { z } from "zod";
import {
  MAP_CONFIG,
  calculateLatitudeSpan,
  calculateLongitudeSpan,
} from "@/config/map";
import { REPORT_CATEGORIES, REPORT_SEVERITIES } from "@/types/report";

const numericCoordinate = (paramName: string, min: number, max: number) =>
  z.preprocess(
    (val) => {
      if (typeof val === "number") return val;
      if (typeof val === "string" && val.trim().length > 0) {
        const num = Number(val);
        if (Number.isFinite(num)) return num;
      }
      return val;
    },
    z
      .number()
      .min(min, `${paramName} must be at least ${min}`)
      .max(max, `${paramName} must be at most ${max}`)
      .refine((val) => Number.isFinite(val), {
        message: `${paramName} must be a finite number`,
      })
  );

const numericLimit = z.preprocess(
  (val) => {
    if (val === undefined || val === null || val === "") return MAP_CONFIG.DEFAULT_LIMIT;
    if (typeof val === "number") return val;
    if (typeof val === "string" && val.trim().length > 0) {
      const num = Number(val);
      if (Number.isFinite(num)) return num;
    }
    return val;
  },
  z
    .number()
    .int("limit must be an integer")
    .min(MAP_CONFIG.MIN_LIMIT, `limit must be at least ${MAP_CONFIG.MIN_LIMIT}`)
    .max(MAP_CONFIG.MAX_LIMIT, `limit cannot exceed ${MAP_CONFIG.MAX_LIMIT}`)
);

/**
 * Strict schema for parsing and validating GET /api/reports/map query parameters.
 */
export const mapQuerySchema = z
  .object({
    south: numericCoordinate("south", -90, 90),
    west: numericCoordinate("west", -180, 180),
    north: numericCoordinate("north", -90, 90),
    east: numericCoordinate("east", -180, 180),
    category: z.enum(REPORT_CATEGORIES).optional(),
    status: z.enum(["pending", "in_progress", "resolved", "all"]).optional(),
    severity: z.enum(REPORT_SEVERITIES).optional(),
    department_id: z.string().uuid("Invalid department UUID").optional(),
    limit: numericLimit.default(MAP_CONFIG.DEFAULT_LIMIT),
    sort: z.enum(MAP_CONFIG.SORT_OPTIONS).default("newest"),
  })
  .strict()
  .superRefine((val, ctx) => {
    // 1. Latitude ordering: south must be strictly less than north
    if (val.south >= val.north) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["south"],
        message: "Southern latitude must be strictly less than northern latitude",
      });
    }

    // 2. Longitude ordering: degenerate zero-width viewports are rejected
    if (val.west === val.east) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["west"],
        message: "Western and eastern longitudes cannot be identical (zero-width viewport)",
      });
    }

    // 3. Viewport size protection: Prevent excessive global/world scans
    const latSpan = calculateLatitudeSpan(val.south, val.north);
    if (latSpan > MAP_CONFIG.MAX_LATITUDE_SPAN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["north"],
        message: `Viewport latitude span (${latSpan.toFixed(2)}°) exceeds maximum allowed span of ${MAP_CONFIG.MAX_LATITUDE_SPAN}°. Please zoom in.`,
      });
    }

    const lonSpan = calculateLongitudeSpan(val.west, val.east);
    if (lonSpan > MAP_CONFIG.MAX_LONGITUDE_SPAN) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["east"],
        message: `Viewport longitude span (${lonSpan.toFixed(2)}°) exceeds maximum allowed span of ${MAP_CONFIG.MAX_LONGITUDE_SPAN}°. Please zoom in.`,
      });
    }
  });

export type MapQuerySchema = z.infer<typeof mapQuerySchema>;
