import { z } from "zod";

/**
 * Zod schema validating the canonical admin statistics response contract.
 * Mirrors GET /api/stats?scope=admin specification in docs/backend.md:
 * { total, pending, inProgress, resolved, criticalActive?, resolutionRate }
 */
export const adminStatsSchema = z.object({
  total: z.number().int().nonnegative(),
  pending: z.number().int().nonnegative(),
  inProgress: z.number().int().nonnegative(),
  resolved: z.number().int().nonnegative(),
  criticalActive: z.number().int().nonnegative().optional(),
  resolutionRate: z.number().min(0).max(100).nullable(),
});

export type AdminStatsResponse = z.infer<typeof adminStatsSchema>;

/**
 * Isolated development fixtures for admin statistics visual development.
 * Truthfully labeled as demo data until backend endpoint GET /api/stats?scope=admin is provisioned.
 */
export const mockAdminStats: AdminStatsResponse = {
  total: 3,
  pending: 1,
  inProgress: 1,
  resolved: 1,
  criticalActive: 1,
  resolutionRate: 33.3,
};

export const mockEmptyAdminStats: AdminStatsResponse = {
  total: 0,
  pending: 0,
  inProgress: 0,
  resolved: 0,
  criticalActive: 0,
  resolutionRate: null,
};

/**
 * Safe runtime parser for admin statistics payloads.
 * Strictly rejects negative counts, NaN, and non-numeric representations.
 */
export function validateAdminStats(data: unknown): AdminStatsResponse {
  return adminStatsSchema.parse(data);
}

/**
 * Calculates a verified resolution rate percentage.
 * Returns null if total is zero or invalid, preventing division by zero.
 */
export function calculateResolutionRate(
  resolved: number,
  total: number
): number | null {
  if (
    total <= 0 ||
    !Number.isFinite(total) ||
    !Number.isFinite(resolved) ||
    resolved < 0
  ) {
    return null;
  }
  const rate = (resolved / total) * 100;
  return Math.min(100, Math.max(0, Math.round(rate * 10) / 10));
}

export interface StatusDistributionItem {
  count: number;
  percentage: number;
}

export interface StatusDistribution {
  pending: StatusDistributionItem;
  inProgress: StatusDistributionItem;
  resolved: StatusDistributionItem;
}

/**
 * Calculates the percentage distribution of complaints across canonical statuses.
 * Guaranteed to handle total === 0 without division by zero or NaN.
 */
export function calculateStatusDistribution(stats: {
  total: number;
  pending: number;
  inProgress: number;
  resolved: number;
}): StatusDistribution {
  const total = stats.total;

  if (total <= 0 || !Number.isFinite(total)) {
    return {
      pending: { count: 0, percentage: 0 },
      inProgress: { count: 0, percentage: 0 },
      resolved: { count: 0, percentage: 0 },
    };
  }

  const calcPercentage = (count: number) => {
    if (count <= 0 || !Number.isFinite(count)) return 0;
    return Math.min(100, Math.round((count / total) * 1000) / 10);
  };

  return {
    pending: {
      count: Math.max(0, stats.pending),
      percentage: calcPercentage(stats.pending),
    },
    inProgress: {
      count: Math.max(0, stats.inProgress),
      percentage: calcPercentage(stats.inProgress),
    },
    resolved: {
      count: Math.max(0, stats.resolved),
      percentage: calcPercentage(stats.resolved),
    },
  };
}
