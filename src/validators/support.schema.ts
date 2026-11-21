import { z } from "zod";

/**
 * Validates report ID parameter in URL path.
 */
export const reportIdParamSchema = z
  .string()
  .uuid("Invalid report ID format. Must be a valid UUID v4.");

/**
 * Strict schema for optional request body for POST /api/reports/:id/upvote.
 * An empty object or empty body is permitted.
 * Strictly rejects any client-supplied parameters (e.g. user_id, vote_count, role, status, priority_score).
 */
export const upvoteBodySchema = z.object({}).strict();

export type UpvoteBodyInput = z.infer<typeof upvoteBodySchema>;
