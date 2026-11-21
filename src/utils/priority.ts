import { PRIORITY_CONFIG, type PrioritySeverity } from "@/config/priority";
import type { CalculatePriorityInput, PriorityBreakdown } from "@/types/priority";

/**
 * Resolves the canonical severity and corresponding point allocation.
 * Defaults to 'medium' (30 points) if unknown or invalid.
 */
export function resolveSeverityPoints(severity: string): {
  severity: PrioritySeverity;
  points: number;
} {
  const normalized = (severity || "").trim().toLowerCase();
  if (normalized in PRIORITY_CONFIG.SEVERITY_POINTS) {
    const key = normalized as PrioritySeverity;
    return {
      severity: key,
      points: PRIORITY_CONFIG.SEVERITY_POINTS[key],
    };
  }
  return {
    severity: PRIORITY_CONFIG.DEFAULT_SEVERITY,
    points: PRIORITY_CONFIG.SEVERITY_POINTS[PRIORITY_CONFIG.DEFAULT_SEVERITY],
  };
}

/**
 * Calculates community support points from valid distinct votes:
 * votePoints = min(3 * voteCount, 20)
 */
export function calculateVotePoints(voteCount: number): number {
  const validVotes = Math.max(0, Math.floor(voteCount || 0));
  return Math.min(
    PRIORITY_CONFIG.MAX_VOTE_POINTS,
    validVotes * PRIORITY_CONFIG.VOTE_MULTIPLIER
  );
}

/**
 * Calculates complaint age in fully completed 24-hour periods.
 * For resolved complaints, age accumulation stops at resolvedAt.
 * Handles future timestamps safely by returning 0 days.
 */
export function calculateDaysPending(
  createdAt: Date | string,
  resolvedAt?: Date | string | null,
  asOf?: Date | string
): number {
  const createdMs = new Date(createdAt).getTime();
  if (isNaN(createdMs)) return 0;

  let effectiveAsOfMs: number;
  if (resolvedAt) {
    const resolvedMs = new Date(resolvedAt).getTime();
    effectiveAsOfMs = isNaN(resolvedMs) ? Date.now() : resolvedMs;
  } else if (asOf) {
    const asOfMs = new Date(asOf).getTime();
    effectiveAsOfMs = isNaN(asOfMs) ? Date.now() : asOfMs;
  } else {
    effectiveAsOfMs = Date.now();
  }

  const elapsedSeconds = (effectiveAsOfMs - createdMs) / 1000;
  if (elapsedSeconds <= 0) return 0;

  return Math.floor(elapsedSeconds / PRIORITY_CONFIG.SECONDS_PER_DAY);
}

/**
 * Calculates age points from completed unresolved days:
 * agePoints = min(2 * daysPending, 10)
 */
export function calculateAgePoints(daysPending: number): number {
  const validDays = Math.max(0, Math.floor(daysPending || 0));
  return Math.min(
    PRIORITY_CONFIG.MAX_AGE_POINTS,
    validDays * PRIORITY_CONFIG.AGE_MULTIPLIER
  );
}

/**
 * Pure, deterministic calculation of the official CivicPulse priority score and component breakdown:
 * priority_score = min(
 *   100,
 *   severityPoints + min(3 * voteCount, 20) + min(2 * daysPending, 10)
 * )
 */
export function calculatePriority(input: CalculatePriorityInput): PriorityBreakdown {
  const { severity, points: severityPoints } = resolveSeverityPoints(input.severity);
  const supportPoints = calculateVotePoints(input.voteCount);
  const agePoints = calculateAgePoints(input.daysUnresolved);

  const rawTotal = severityPoints + supportPoints + agePoints;
  const finalScore = Math.min(
    PRIORITY_CONFIG.MAX_PRIORITY_SCORE,
    Math.max(PRIORITY_CONFIG.MIN_PRIORITY_SCORE, rawTotal)
  );

  return {
    severity,
    severity_points: severityPoints,
    support_count: Math.max(0, Math.floor(input.voteCount || 0)),
    support_points: supportPoints,
    days_unresolved: Math.max(0, Math.floor(input.daysUnresolved || 0)),
    age_points: agePoints,
    priority_score: finalScore,
    max_score: PRIORITY_CONFIG.MAX_PRIORITY_SCORE,
  };
}

/**
 * Calculates the initial priority score at report creation:
 * At creation: voteCount = 0, daysPending = 0, so initial priority = severityPoints.
 */
export function calculateInitialPriority(severity: string): number {
  return resolveSeverityPoints(severity).points;
}
