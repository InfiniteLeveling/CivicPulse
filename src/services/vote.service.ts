import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthenticatedUser } from "@/types/auth";
import type { ReportSupportSummary, SupportReportResponseData } from "@/types/support";
import { AppError } from "@/utils/app-error";
import { logger } from "@/utils/logger";

interface RawReportRecord {
  id: string;
  user_id: string;
  status: string;
  publication?: string;
  visibility?: string;
}

/**
 * CivicPulse Community Support Service
 *
 * Implements authenticated complaint upvoting with strict One-User-One-Vote enforcement,
 * database uniqueness protection, self-voting prevention, status eligibility validation,
 * and accurate support counting under PostgreSQL Row Level Security.
 *
 * Rules:
 * 1. Citizen Role: Only verified citizens may cast votes (admins are observers).
 * 2. Self-Voting: Creators cannot support their own complaints (HTTP 403).
 * 3. Eligibility: Unresolved complaints only ('pending', 'in_progress'). Resolved complaints are closed (HTTP 409).
 * 4. Visibility: Inaccessible private/hidden complaints return HTTP 404 (no existence leakage).
 * 5. Idempotent Repeated Requests: Second vote by same user returns HTTP 200 already_supported: true without duplicate insertion.
 * 6. Concurrency: Guaranteed single-vote per (report_id, user_id) pair via database unique constraint.
 * 7. Privacy: Voter identities, emails, and profiles are never disclosed.
 */

export async function supportReport(
  reportId: string,
  caller: AuthenticatedUser,
  client?: SupabaseClient
): Promise<SupportReportResponseData> {
  const startTime = Date.now();

  // 1. Session and identity verification
  if (!caller || !caller.id) {
    logger.warn("auth.unauthorized", { status: 401 });
    throw new AppError("UNAUTHORIZED", "Authentication required to support complaints");
  }

  // 2. Role verification: Admins cannot participate in community voting
  if (caller.role === "admin") {
    logger.warn("vote.forbidden", { status: 403 });
    throw new AppError("FORBIDDEN", "Administrative accounts cannot upvote complaints");
  }

  const supabase = client ?? (await createSupabaseServerClient());

  // 3. Attempt RPC function if supported by the database
  if (typeof supabase.rpc === "function") {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "civicpulse_support_report",
      { p_report_id: reportId }
    );

    if (!rpcError && rpcData) {
      const typed = rpcData as SupportReportResponseData;
      if (typed.already_supported) {
        logger.info("vote.already_supported", { status: 200, durationMs: Date.now() - startTime });
      } else {
        logger.info("vote.created", { status: 201, durationMs: Date.now() - startTime });
      }
      return typed;
    }

    if (rpcError) {
      // Map RPC database exceptions to standardized application error codes
      const msg = rpcError.message || "";
      if (msg.includes("cannot support their own")) {
        logger.warn("vote.forbidden", { status: 403 });
        throw new AppError("FORBIDDEN", "Report creators cannot support their own complaints");
      }
      if (msg.includes("not eligible")) {
        logger.warn("vote.ineligible", { status: 409 });
        throw new AppError("CONFLICT", "Resolved complaints are not eligible for community support");
      }
      if (msg.includes("not found")) {
        logger.warn("vote.failed", { status: 404 });
        throw new AppError("NOT_FOUND", "Complaint not found");
      }
      if (msg.includes("Administrative accounts")) {
        logger.warn("vote.forbidden", { status: 403 });
        throw new AppError("FORBIDDEN", "Administrative accounts cannot upvote complaints");
      }
      // If RPC is missing in environment, fall through to direct service-level query builder
    }
  }

  // 4. Query Builder Fallback / Direct Execution
  // Fetch report to verify existence, visibility, ownership, and status
  const { data: reportData, error: reportError } = await supabase
    .from("reports")
    .select("id, user_id, status, publication, visibility")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    logger.error("vote.failed", { status: 500, durationMs: Date.now() - startTime });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve complaint information", {
      cause: reportError,
    });
  }

  if (!reportData) {
    logger.warn("vote.failed", { status: 404 });
    throw new AppError("NOT_FOUND", "Complaint not found");
  }

  const report = reportData as RawReportRecord;

  // 5. Visibility check: Only public listed reports or owner/admin may access
  const isOwner = report.user_id === caller.id;
  const isPublicListed =
    (!report.publication || report.publication === "public") &&
    (!report.visibility || report.visibility === "listed");

  if (!isPublicListed && !isOwner) {
    logger.warn("vote.failed", { status: 404 });
    throw new AppError("NOT_FOUND", "Complaint not found");
  }

  // 6. Self-voting policy: Creators cannot support their own complaints
  if (isOwner) {
    logger.warn("vote.forbidden", { status: 403 });
    throw new AppError("FORBIDDEN", "Report creators cannot support their own complaints");
  }

  // 7. Status eligibility: Only pending or in_progress complaints can receive support
  if (report.status !== "pending" && report.status !== "in_progress") {
    logger.warn("vote.ineligible", { status: 409 });
    throw new AppError("CONFLICT", "Resolved complaints are not eligible for community support");
  }

  // 8. Atomically insert vote record with One-User-One-Vote enforcement
  let alreadySupported = false;
  const { error: insertError } = await supabase
    .from("report_votes")
    .insert({ report_id: reportId, user_id: caller.id });

  if (insertError) {
    // Code 23505 indicates composite unique constraint violation (report_id, user_id)
    const isConflict =
      insertError.code === "23505" ||
      insertError.message?.toLowerCase().includes("unique") ||
      insertError.message?.toLowerCase().includes("duplicate");

    if (isConflict) {
      alreadySupported = true;
      logger.info("vote.already_supported", { status: 200, durationMs: Date.now() - startTime });
    } else {
      logger.error("vote.failed", { status: 500, durationMs: Date.now() - startTime });
      throw new AppError("INTERNAL_SERVER_ERROR", "Failed to record community support", {
        cause: insertError,
      });
    }
  } else {
    logger.info("vote.created", { status: 201, durationMs: Date.now() - startTime });
  }

  // 9. Authoritative support count from database
  const { count } = await supabase
    .from("report_votes")
    .select("*", { count: "exact", head: true })
    .eq("report_id", reportId);

  const finalCount = Math.max(1, count ?? 1);

  return {
    report_id: reportId,
    supported: true,
    already_supported: alreadySupported,
    support_count: finalCount,
  };
}

/**
 * Retrieves the authorized community support summary for a complaint.
 * Excludes voter identities and protects hidden reports from count leakage.
 */
export async function getReportSupportSummary(
  reportId: string,
  caller?: AuthenticatedUser | null,
  client?: SupabaseClient
): Promise<ReportSupportSummary> {
  const startTime = Date.now();
  const supabase = client ?? (await createSupabaseServerClient());

  // 1. Attempt RPC function if available
  if (typeof supabase.rpc === "function") {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "civicpulse_get_support_summary",
      { p_report_id: reportId }
    );

    if (!rpcError && rpcData) {
      logger.info("vote.summary_retrieved", { status: 200, durationMs: Date.now() - startTime });
      return rpcData as ReportSupportSummary;
    }
  }

  // 2. Fetch report to verify existence and visibility
  const { data: reportData, error: reportError } = await supabase
    .from("reports")
    .select("id, user_id, status, publication, visibility")
    .eq("id", reportId)
    .maybeSingle();

  if (reportError) {
    logger.error("vote.failed", { status: 500, durationMs: Date.now() - startTime });
    throw new AppError("INTERNAL_SERVER_ERROR", "Failed to retrieve complaint information", {
      cause: reportError,
    });
  }

  if (!reportData) {
    logger.warn("vote.failed", { status: 404 });
    throw new AppError("NOT_FOUND", "Complaint not found");
  }

  const report = reportData as RawReportRecord;

  // Visibility check
  const isOwner = caller?.id ? report.user_id === caller.id : false;
  const isAdmin = caller?.role === "admin";
  const isPublicListed =
    (!report.publication || report.publication === "public") &&
    (!report.visibility || report.visibility === "listed");

  if (!isPublicListed && !isOwner && !isAdmin) {
    logger.warn("vote.failed", { status: 404 });
    throw new AppError("NOT_FOUND", "Complaint not found");
  }

  // 3. Count total votes
  const { count } = await supabase
    .from("report_votes")
    .select("*", { count: "exact", head: true })
    .eq("report_id", reportId);

  const supportCount = count ?? 0;

  // 4. Determine if current user has supported
  let currentUserSupported = false;
  if (caller?.id) {
    const { data: userVote } = await supabase
      .from("report_votes")
      .select("id")
      .eq("report_id", reportId)
      .eq("user_id", caller.id)
      .maybeSingle();

    currentUserSupported = Boolean(userVote);
  }

  // 5. Evaluate can_support advisory UX flag
  const canSupport = Boolean(
    caller &&
    caller.role === "citizen" &&
    (report.status === "pending" || report.status === "in_progress") &&
    report.user_id !== caller.id &&
    !currentUserSupported
  );

  logger.info("vote.summary_retrieved", { status: 200, durationMs: Date.now() - startTime });

  return {
    report_id: reportId,
    support_count: supportCount,
    current_user_supported: currentUserSupported,
    can_support: canSupport,
  };
}

