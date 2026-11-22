/**
 * CivicPulse Priority Scoring Engine Configuration
 *
 * Implements the official, deterministic, explainable CivicPulse priority formula:
 * priority_score = min(
 *   100,
 *   severityPoints + min(3 * voteCount, 20) + min(2 * daysPending, 10)
 * )
 */

export const PRIORITY_CONFIG = {
  /**
   * Severity point allocations (canonical stored severity values).
   */
  SEVERITY_POINTS: {
    low: 15,
    medium: 30,
    high: 50,
    critical: 70,
  } as const,

  /**
   * Default severity fallback if unknown or missing in database state.
   */
  DEFAULT_SEVERITY: "medium" as const,

  /**
   * Community support points: 3 points per valid distinct vote, capped at 20 points.
   */
  VOTE_MULTIPLIER: 3,
  MAX_VOTE_POINTS: 20,

  /**
   * Complaint age points: 2 points per completed 24-hour day unresolved, capped at 10 points.
   */
  AGE_MULTIPLIER: 2,
  MAX_AGE_POINTS: 10,

  /**
   * Maximum authoritative score cap.
   */
  MAX_PRIORITY_SCORE: 100,

  /**
   * Minimum authoritative score.
   */
  MIN_PRIORITY_SCORE: 0,

  /**
   * Number of seconds in a standard 24-hour day (used for UTC elapsed time calculation).
   */
  SECONDS_PER_DAY: 86400,

  /**
   * Advisory human-readable priority labels for optional UI presentation.
   */
  LABELS: {
    LOW_MAX: 29,
    MODERATE_MAX: 49,
    HIGH_MAX: 69,
  } as const,
} as const;

export type PrioritySeverity = keyof typeof PRIORITY_CONFIG.SEVERITY_POINTS;

/**
 * Maps a numeric priority score (0-100) to an advisory UI label.
 */
export function getPriorityLabel(score: number): "low" | "moderate" | "high" | "critical" {
  if (score <= PRIORITY_CONFIG.LABELS.LOW_MAX) return "low";
  if (score <= PRIORITY_CONFIG.LABELS.MODERATE_MAX) return "moderate";
  if (score <= PRIORITY_CONFIG.LABELS.HIGH_MAX) return "high";
  return "critical";
}
