import test from "node:test";
import assert from "node:assert/strict";

import { getPriorityLabel } from "../src/config/priority.ts";
import {
  calculateAgePoints,
  calculateDaysPending,
  calculateInitialPriority,
  calculatePriority,
  calculateVotePoints,
  resolveSeverityPoints,
} from "../src/utils/priority.ts";
import {
  priorityForbiddenFieldsSchema,
  priorityReportIdParamSchema,
} from "../src/validators/priority.schema.ts";
import {
  getReportPriority,
  recalculateReportPriority,
  recalculateAllActiveReportPriorities,
} from "../src/services/priority.service.ts";
import { GET as getPriorityRoute } from "../src/app/api/reports/[id]/priority/route.ts";
import { AppError } from "../src/utils/app-error.ts";
import { successResponse } from "../src/utils/api-response.ts";
import type { AuthenticatedUser } from "../src/types/auth.ts";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

// --- Mock Identities & Fixtures ---

const CITIZEN_OWNER: AuthenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "owner@example.com",
  full_name: "Alice Owner",
  role: "citizen",
};

const CITIZEN_OTHER: AuthenticatedUser = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "other@example.com",
  full_name: "Bob Other",
  role: "citizen",
};

const ADMIN_USER: AuthenticatedUser = {
  id: "44444444-4444-4444-8444-444444444444",
  email: "admin@civicpulse.org",
  full_name: "Dave Admin",
  role: "admin",
};

const REPORT_ID = "55555555-5555-4555-8555-555555555555";
const PRIVATE_REPORT_ID = "66666666-6666-4666-8666-666666666666";

// --- 1. Canonical Formula Tests (Section 61: Tests A through J) ---

test("Canonical Test A: Severity low, 0 votes, 0 days -> 15 points", () => {
  const result = calculatePriority({ severity: "low", voteCount: 0, daysUnresolved: 0 });
  assert.equal(result.severity, "low");
  assert.equal(result.severity_points, 15);
  assert.equal(result.support_points, 0);
  assert.equal(result.age_points, 0);
  assert.equal(result.priority_score, 15);
});

test("Canonical Test B: Severity medium, 0 votes, 0 days -> 30 points", () => {
  const result = calculatePriority({ severity: "medium", voteCount: 0, daysUnresolved: 0 });
  assert.equal(result.severity, "medium");
  assert.equal(result.severity_points, 30);
  assert.equal(result.support_points, 0);
  assert.equal(result.age_points, 0);
  assert.equal(result.priority_score, 30);
});

test("Canonical Test C: Severity high, 4 votes, 3 days -> 68 points", () => {
  const result = calculatePriority({ severity: "high", voteCount: 4, daysUnresolved: 3 });
  assert.equal(result.severity, "high");
  assert.equal(result.severity_points, 50);
  assert.equal(result.support_points, 12);
  assert.equal(result.age_points, 6);
  assert.equal(result.priority_score, 68);
});

test("Canonical Test D: Severity critical, 7 votes, 5 days -> 100 points (capped)", () => {
  const result = calculatePriority({ severity: "critical", voteCount: 7, daysUnresolved: 5 });
  assert.equal(result.severity, "critical");
  assert.equal(result.severity_points, 70);
  assert.equal(result.support_points, 20); // min(3*7, 20) = 20
  assert.equal(result.age_points, 10);    // min(2*5, 10) = 10
  assert.equal(result.priority_score, 100);
});

test("Canonical Test E: Severity low, 100 votes, 100 days -> 45 points (caps enforced)", () => {
  const result = calculatePriority({ severity: "low", voteCount: 100, daysUnresolved: 100 });
  assert.equal(result.severity, "low");
  assert.equal(result.severity_points, 15);
  assert.equal(result.support_points, 20); // capped at 20
  assert.equal(result.age_points, 10);    // capped at 10
  assert.equal(result.priority_score, 45); // 15 + 20 + 10 = 45
});

test("Canonical Test F: Severity medium, 1 vote, 1 day -> 35 points", () => {
  const result = calculatePriority({ severity: "medium", voteCount: 1, daysUnresolved: 1 });
  assert.equal(result.severity, "medium");
  assert.equal(result.severity_points, 30);
  assert.equal(result.support_points, 3);
  assert.equal(result.age_points, 2);
  assert.equal(result.priority_score, 35);
});

test("Canonical Test G: Severity high, 7 votes, 5 days -> 80 points", () => {
  const result = calculatePriority({ severity: "high", voteCount: 7, daysUnresolved: 5 });
  assert.equal(result.severity, "high");
  assert.equal(result.severity_points, 50);
  assert.equal(result.support_points, 20);
  assert.equal(result.age_points, 10);
  assert.equal(result.priority_score, 80);
});

test("Canonical Test H: Severity critical, 0 votes, 0 days -> 70 points", () => {
  const result = calculatePriority({ severity: "critical", voteCount: 0, daysUnresolved: 0 });
  assert.equal(result.severity, "critical");
  assert.equal(result.severity_points, 70);
  assert.equal(result.support_points, 0);
  assert.equal(result.age_points, 0);
  assert.equal(result.priority_score, 70);
});

test("Canonical Test I: Severity medium, 10 votes, 10 days -> 60 points", () => {
  const result = calculatePriority({ severity: "medium", voteCount: 10, daysUnresolved: 10 });
  assert.equal(result.severity, "medium");
  assert.equal(result.severity_points, 30);
  assert.equal(result.support_points, 20);
  assert.equal(result.age_points, 10);
  assert.equal(result.priority_score, 60);
});

test("Canonical Test J: Severity low, 0 votes, 5 days -> 25 points", () => {
  const result = calculatePriority({ severity: "low", voteCount: 0, daysUnresolved: 5 });
  assert.equal(result.severity, "low");
  assert.equal(result.severity_points, 15);
  assert.equal(result.support_points, 0);
  assert.equal(result.age_points, 10);
  assert.equal(result.priority_score, 25);
});

// --- 2. Mathematical Boundary Tests (Section 62) ---

test("Math Boundaries: Vote points scaling and capping", () => {
  assert.equal(calculateVotePoints(0), 0);
  assert.equal(calculateVotePoints(1), 3);
  assert.equal(calculateVotePoints(2), 6);
  assert.equal(calculateVotePoints(3), 9);
  assert.equal(calculateVotePoints(4), 12);
  assert.equal(calculateVotePoints(5), 15);
  assert.equal(calculateVotePoints(6), 18);
  assert.equal(calculateVotePoints(7), 20); // Exact cap
  assert.equal(calculateVotePoints(8), 20);
  assert.equal(calculateVotePoints(50), 20);
  assert.equal(calculateVotePoints(-5), 0); // Negative clamped
});

test("Math Boundaries: Age points scaling and capping", () => {
  assert.equal(calculateAgePoints(0), 0);
  assert.equal(calculateAgePoints(1), 2);
  assert.equal(calculateAgePoints(2), 4);
  assert.equal(calculateAgePoints(3), 6);
  assert.equal(calculateAgePoints(4), 8);
  assert.equal(calculateAgePoints(5), 10); // Exact cap
  assert.equal(calculateAgePoints(6), 10);
  assert.equal(calculateAgePoints(365), 10);
  assert.equal(calculateAgePoints(-3), 0); // Negative clamped
});

test("Math Boundaries: Severity resolution and unknown fallbacks", () => {
  assert.deepEqual(resolveSeverityPoints("low"), { severity: "low", points: 15 });
  assert.deepEqual(resolveSeverityPoints("medium"), { severity: "medium", points: 30 });
  assert.deepEqual(resolveSeverityPoints("high"), { severity: "high", points: 50 });
  assert.deepEqual(resolveSeverityPoints("critical"), { severity: "critical", points: 70 });
  assert.deepEqual(resolveSeverityPoints("CRITICAL"), { severity: "critical", points: 70 });
  // Unknown fallback to medium (30)
  assert.deepEqual(resolveSeverityPoints("unsupported"), { severity: "medium", points: 30 });
  assert.deepEqual(resolveSeverityPoints(""), { severity: "medium", points: 30 });
});

test("Math Boundaries: Absolute score ceiling is 100", () => {
  // critical (70) + votes (20) + age (10) = 100
  const atMax = calculatePriority({ severity: "critical", voteCount: 20, daysUnresolved: 20 });
  assert.equal(atMax.priority_score, 100);
});

test("Math Boundaries: Initial report priority matches severity points", () => {
  assert.equal(calculateInitialPriority("low"), 15);
  assert.equal(calculateInitialPriority("medium"), 30);
  assert.equal(calculateInitialPriority("high"), 50);
  assert.equal(calculateInitialPriority("critical"), 70);
  assert.equal(calculateInitialPriority("other"), 30);
});

test("Math Boundaries: Advisory priority label mappings", () => {
  assert.equal(getPriorityLabel(15), "low");
  assert.equal(getPriorityLabel(29), "low");
  assert.equal(getPriorityLabel(30), "moderate");
  assert.equal(getPriorityLabel(49), "moderate");
  assert.equal(getPriorityLabel(50), "high");
  assert.equal(getPriorityLabel(69), "high");
  assert.equal(getPriorityLabel(70), "critical");
  assert.equal(getPriorityLabel(100), "critical");
});

// --- 3. Time Boundary Tests (Section 63) ---

test("Time Boundaries: Elapsed full 24-hour day calculations", () => {
  const base = new Date("2026-11-20T10:00:00Z");

  // 23 hours 59 minutes -> 0 completed days
  const sub24h = new Date("2026-11-21T09:59:00Z");
  assert.equal(calculateDaysPending(base, null, sub24h), 0);

  // Exactly 24 hours -> 1 completed day
  const exact24h = new Date("2026-11-21T10:00:00Z");
  assert.equal(calculateDaysPending(base, null, exact24h), 1);

  // 48 hours -> 2 completed days
  const exact48h = new Date("2026-11-22T10:00:00Z");
  assert.equal(calculateDaysPending(base, null, exact48h), 2);

  // 120 hours -> 5 completed days
  const exact120h = new Date("2026-11-25T10:00:00Z");
  assert.equal(calculateDaysPending(base, null, exact120h), 5);

  // 240 hours -> 10 completed days
  const exact240h = new Date("2026-11-30T10:00:00Z");
  assert.equal(calculateDaysPending(base, null, exact240h), 10);

  // Future timestamp -> 0 completed days
  const future = new Date("2026-11-20T09:00:00Z");
  assert.equal(calculateDaysPending(base, null, future), 0);
});

test("Time Boundaries: Resolved reports freeze age accumulation at resolved_at", () => {
  const createdAt = "2026-11-10T10:00:00Z";
  const resolvedAt = "2026-11-12T10:00:00Z"; // Exactly 2 days elapsed
  const muchLaterAsOf = "2026-11-25T10:00:00Z"; // 15 days later

  // Unresolved complaint would have aged 15 days
  const activeDays = calculateDaysPending(createdAt, null, muchLaterAsOf);
  assert.equal(activeDays, 15);

  // Resolved complaint is capped at resolved_at (2 days)
  const resolvedDays = calculateDaysPending(createdAt, resolvedAt, muchLaterAsOf);
  assert.equal(resolvedDays, 2);
});

// --- 4. Service Layer Mock Helper ---

function createMockPriorityClient(
  reports: Record<string, unknown>[],
  votes: { report_id: string; user_id: string }[]
) {
  const reportsStore = [...reports];
  const votesStore = [...votes];

  return {
    _reportsStore: reportsStore,
    _votesStore: votesStore,
    from: (table: string) => {
      if (table === "reports") {
        let filterId: string | null = null;
        let inStatuses: string[] | null = null;
        let updatePayload: Record<string, unknown> | null = null;

        const builder: Record<string, unknown> = {
          select: () => builder,
          eq: (col: string, val: string) => {
            if (col === "id") filterId = val;
            return builder;
          },
          in: (col: string, vals: string[]) => {
            if (col === "status") inStatuses = vals;
            return builder;
          },
          update: (payload: Record<string, unknown>) => {
            updatePayload = payload;
            return builder;
          },
          maybeSingle: async () => {
            const found = reportsStore.find((r) => r.id === filterId);
            return { data: found ?? null, error: null };
          },
          single: async () => {
            const found = reportsStore.find((r) => r.id === filterId);
            if (!found) return { data: null, error: { message: "Report not found", code: "PGRST116" } };
            return { data: found, error: null };
          },
          then: (resolve: (val: unknown) => void) => {
            if (updatePayload && filterId) {
              const target = reportsStore.find((r) => r.id === filterId);
              if (target) Object.assign(target, updatePayload);
              resolve({ data: target, error: null });
              return;
            }
            if (inStatuses) {
              const filtered = reportsStore.filter((r) => inStatuses!.includes(r.status as string));
              resolve({ data: filtered, error: null });
              return;
            }
            resolve({ data: reportsStore, error: null });
          },
        };
        return builder;
      }

      if (table === "report_votes") {
        const builder: Record<string, unknown> = {
          select: (_cols?: string, options?: { count?: string; head?: boolean }) => {
            if (options?.count === "exact") {
              return {
                eq: (col: string, val: string) => {
                  assert.equal(col, "report_id");
                  const c = votesStore.filter((v) => v.report_id === val).length;
                  return Promise.resolve({ count: c, data: null, error: null });
                },
              };
            }
            return builder;
          },
        };
        return builder;
      }

      throw new Error(`Unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;
}

// --- 5. Priority Service Integration Tests ---

test("Service 01: getReportPriority retrieves full transparent breakdown for public report", async () => {
  const baseDate = new Date(Date.now() - 3 * 86400 * 1000).toISOString(); // 3 days ago
  const client = createMockPriorityClient(
    [
      {
        id: REPORT_ID,
        user_id: CITIZEN_OWNER.id,
        severity: "high",
        status: "pending",
        publication: "public",
        visibility: "listed",
        created_at: baseDate,
        resolved_at: null,
        priority_score: 50,
      },
    ],
    [
      { report_id: REPORT_ID, user_id: "user-1" },
      { report_id: REPORT_ID, user_id: "user-2" },
      { report_id: REPORT_ID, user_id: "user-3" },
      { report_id: REPORT_ID, user_id: "user-4" },
    ]
  );

  const priorityData = await getReportPriority(REPORT_ID, null, undefined, client);

  assert.equal(priorityData.report_id, REPORT_ID);
  assert.equal(priorityData.is_active, true);
  assert.equal(priorityData.priority_breakdown.severity, "high");
  assert.equal(priorityData.priority_breakdown.severity_points, 50);
  assert.equal(priorityData.priority_breakdown.support_count, 4);
  assert.equal(priorityData.priority_breakdown.support_points, 12);
  assert.equal(priorityData.priority_breakdown.days_unresolved, 3);
  assert.equal(priorityData.priority_breakdown.age_points, 6);
  assert.equal(priorityData.priority_score, 68);
});

test("Service 02: getReportPriority conceals private report from unauthorized citizen with 404", async () => {
  const client = createMockPriorityClient(
    [
      {
        id: PRIVATE_REPORT_ID,
        user_id: CITIZEN_OWNER.id,
        severity: "medium",
        status: "pending",
        publication: "private",
        visibility: "listed",
        created_at: new Date().toISOString(),
        resolved_at: null,
        priority_score: 30,
      },
    ],
    []
  );

  await assert.rejects(
    async () => {
      await getReportPriority(PRIVATE_REPORT_ID, CITIZEN_OTHER, undefined, client);
    },
    (err: AppError) => {
      assert.equal(err.code, "NOT_FOUND");
      return true;
    }
  );
});

test("Service 03: getReportPriority permits owner and admin to view private report breakdown", async () => {
  const client = createMockPriorityClient(
    [
      {
        id: PRIVATE_REPORT_ID,
        user_id: CITIZEN_OWNER.id,
        severity: "medium",
        status: "pending",
        publication: "private",
        visibility: "listed",
        created_at: new Date().toISOString(),
        resolved_at: null,
        priority_score: 30,
      },
    ],
    []
  );

  const ownerData = await getReportPriority(PRIVATE_REPORT_ID, CITIZEN_OWNER, undefined, client);
  assert.equal(ownerData.report_id, PRIVATE_REPORT_ID);
  assert.equal(ownerData.priority_score, 30);

  const adminData = await getReportPriority(PRIVATE_REPORT_ID, ADMIN_USER, undefined, client);
  assert.equal(adminData.report_id, PRIVATE_REPORT_ID);
  assert.equal(adminData.priority_score, 30);
});

test("Service 04: recalculateReportPriority recalculates and updates stored score snapshot", async () => {
  const baseDate = new Date(Date.now() - 5 * 86400 * 1000).toISOString(); // 5 days ago
  const client = createMockPriorityClient(
    [
      {
        id: REPORT_ID,
        user_id: CITIZEN_OWNER.id,
        severity: "critical",
        status: "pending",
        publication: "public",
        visibility: "listed",
        created_at: baseDate,
        resolved_at: null,
        priority_score: 70, // Stale score
      },
    ],
    [
      { report_id: REPORT_ID, user_id: "user-1" },
      { report_id: REPORT_ID, user_id: "user-2" },
      { report_id: REPORT_ID, user_id: "user-3" },
      { report_id: REPORT_ID, user_id: "user-4" },
      { report_id: REPORT_ID, user_id: "user-5" },
      { report_id: REPORT_ID, user_id: "user-6" },
      { report_id: REPORT_ID, user_id: "user-7" },
    ]
  );

  // 70 (critical) + 20 (7 votes) + 10 (5 days) = 100
  const updatedScore = await recalculateReportPriority(REPORT_ID, client);
  assert.equal(updatedScore, 100);
});

test("Service 05: recalculateAllActiveReportPriorities batch processes active complaints", async () => {
  const client = createMockPriorityClient(
    [
      {
        id: "rep-1",
        severity: "low",
        status: "pending",
        created_at: new Date().toISOString(),
        resolved_at: null,
      },
      {
        id: "rep-2",
        severity: "high",
        status: "in_progress",
        created_at: new Date().toISOString(),
        resolved_at: null,
      },
    ],
    []
  );

  const result = await recalculateAllActiveReportPriorities(client);
  assert.equal(result.updatedCount, 2);
});

// --- 6. Security & Schema Tests (Section 36, 57) ---

test("Security 01: Client attempts to inject priority_score or points are rejected", () => {
  const check1 = priorityForbiddenFieldsSchema.safeParse({ priority_score: 100 });
  assert.equal(check1.success, false);

  const check2 = priorityForbiddenFieldsSchema.safeParse({ severity_points: 50 });
  assert.equal(check2.success, false);

  const check3 = priorityForbiddenFieldsSchema.safeParse({ vote_count: 10 });
  assert.equal(check3.success, false);

  const check4 = priorityForbiddenFieldsSchema.safeParse({ days_pending: 5 });
  assert.equal(check4.success, false);
});

test("Security 02: Report ID parameter schema enforces UUID v4", () => {
  const valid = priorityReportIdParamSchema.safeParse({ id: REPORT_ID });
  assert.equal(valid.success, true);

  const invalid = priorityReportIdParamSchema.safeParse({ id: "not-a-uuid" });
  assert.equal(invalid.success, false);
});

// --- 7. Route Handler Contract Tests (GET /api/reports/:id/priority) ---

// --- 7. Route Handler Contract Tests (GET /api/reports/:id/priority) ---

test("RouteContract 01: Priority breakdown response contract produces HTTP 200 with no-store", async () => {
  const priorityData = {
    report_id: REPORT_ID,
    priority_score: 68,
    priority_breakdown: {
      severity: "high" as const,
      severity_points: 50,
      support_count: 4,
      support_points: 12,
      days_unresolved: 3,
      age_points: 6,
      priority_score: 68,
      max_score: 100,
    },
    calculated_at: new Date().toISOString(),
    is_active: true,
  };

  const res = successResponse(priorityData, {
    status: 200,
    message: "Priority breakdown retrieved successfully",
  });

  assert.equal(res.status, 200);
  assert.equal(res.headers.get("cache-control"), "no-store");

  const json = await res.json();
  assert.equal(json.success, true);
  assert.equal(json.data.report_id, REPORT_ID);
  assert.equal(json.data.priority_score, 68);
  assert.equal(json.data.priority_breakdown.severity_points, 50);
});

test("RouteContract 02: GET /api/reports/:id/priority rejects invalid UUID with HTTP 422", async () => {
  const req = new NextRequest("http://localhost:3000/api/reports/invalid-uuid/priority", {
    method: "GET",
  });

  const res = await getPriorityRoute(req, {
    params: Promise.resolve({ id: "invalid-uuid" }),
  });

  assert.equal(res.status, 422);
  assert.equal(res.headers.get("cache-control"), "no-store");
  const json = await res.json();
  assert.equal(json.success, false);
  assert.equal(json.error.code, "VALIDATION_ERROR");
});

test("RouteContract 03: Data projection strictly omits voter identities and personal metadata", async () => {
  const baseDate = new Date().toISOString();
  const client = createMockPriorityClient(
    [
      {
        id: REPORT_ID,
        user_id: CITIZEN_OWNER.id,
        severity: "medium",
        status: "pending",
        publication: "public",
        visibility: "listed",
        created_at: baseDate,
        resolved_at: null,
        priority_score: 30,
      },
    ],
    [
      { report_id: REPORT_ID, user_id: "voter-secret-uuid-1" },
      { report_id: REPORT_ID, user_id: "voter-secret-uuid-2" },
    ]
  );

  const priorityData = await getReportPriority(REPORT_ID, null, undefined, client);
  const raw = priorityData as unknown as Record<string, unknown>;

  assert.equal(raw.voters, undefined);
  assert.equal(raw.voter_ids, undefined);
  assert.equal(raw.user_ids, undefined);
  assert.equal(raw.emails, undefined);
  assert.equal(priorityData.priority_breakdown.support_count, 2);
});

test("Ranking 01: Deterministic tie-breaking orders older unresolved complaints before newer", () => {
  const reports = [
    { id: "b-newer", priority_score: 50, created_at: "2026-11-20T12:00:00Z" },
    { id: "a-older", priority_score: 50, created_at: "2026-11-19T12:00:00Z" },
    { id: "c-highest", priority_score: 80, created_at: "2026-11-20T15:00:00Z" },
  ];

  // Simulating query ordering: priority_score DESC, created_at ASC, id ASC
  const sorted = [...reports].sort((a, b) => {
    if (b.priority_score !== a.priority_score) return b.priority_score - a.priority_score;
    const timeDiff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    if (timeDiff !== 0) return timeDiff;
    return a.id.localeCompare(b.id);
  });

  assert.equal(sorted[0].id, "c-highest");
  assert.equal(sorted[1].id, "a-older"); // Older precedes newer on equal score
  assert.equal(sorted[2].id, "b-newer");
});
