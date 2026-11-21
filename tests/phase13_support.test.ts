import test from "node:test";
import assert from "node:assert/strict";

import { reportIdParamSchema, upvoteBodySchema } from "../src/validators/support.schema.ts";
import { supportReport, getReportSupportSummary } from "../src/services/vote.service.ts";
import { errorResponse, successResponse } from "../src/utils/api-response.ts";
import { AppError } from "../src/utils/app-error.ts";
import type { AuthenticatedUser } from "../src/types/auth.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

// --- Test Fixtures & Identities ---

const CITIZEN_CREATOR: AuthenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "creator.alice@example.com",
  full_name: "Alice Creator",
  role: "citizen",
};

const CITIZEN_SUPPORTER_1: AuthenticatedUser = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "supporter.bob@example.com",
  full_name: "Bob Supporter",
  role: "citizen",
};

const CITIZEN_SUPPORTER_2: AuthenticatedUser = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "supporter.carol@example.com",
  full_name: "Carol Supporter",
  role: "citizen",
};

const ADMIN_USER: AuthenticatedUser = {
  id: "44444444-4444-4444-8444-444444444444",
  email: "admin@civicpulse.org",
  full_name: "Admin Dave",
  role: "admin",
};

const VALID_REPORT_ID = "55555555-5555-4555-8555-555555555555";
const SECOND_REPORT_ID = "66666666-6666-4666-8666-666666666666";

// Helper to create an in-memory mock Supabase client simulating reports & report_votes tables
function createMockVoteClient(initialReports: Record<string, unknown>[], initialVotes: { report_id: string; user_id: string }[] = []) {
  const reportsStore = [...initialReports];
  const votesStore = [...initialVotes];

  return {
    _votesStore: votesStore,
    from: (table: string) => {
      if (table === "reports") {
        let filterId: string | null = null;
        const builder: Record<string, unknown> = {
          select: () => builder,
          eq: (col: string, val: string) => {
            if (col === "id") filterId = val;
            return builder;
          },
          maybeSingle: () => {
            const found = reportsStore.find((r) => r.id === filterId);
            return Promise.resolve({ data: found ?? null, error: null });
          },
          single: () => {
            const found = reportsStore.find((r) => r.id === filterId);
            if (!found) return Promise.resolve({ data: null, error: { message: "Row not found", code: "PGRST116" } });
            return Promise.resolve({ data: found, error: null });
          },
        };
        return builder;
      }

      if (table === "report_votes") {
        let filterReportId: string | null = null;
        let filterUserId: string | null = null;

        const builder: Record<string, unknown> = {
          select: (_cols?: string, options?: { count?: string; head?: boolean }) => {
            if (options?.count === "exact") {
              const matchedCount = votesStore.filter((v) => !filterReportId || v.report_id === filterReportId).length;
              return {
                eq: (col: string, val: string) => {
                  if (col === "report_id") filterReportId = val;
                  const c = votesStore.filter((v) => v.report_id === val).length;
                  return Promise.resolve({ count: c, data: null, error: null });
                },
                then: (resolve: (val: unknown) => void) => {
                  resolve({ count: matchedCount, data: null, error: null });
                },
              };
            }
            return builder;
          },
          eq: (col: string, val: string) => {
            if (col === "report_id") filterReportId = val;
            if (col === "user_id") filterUserId = val;
            return builder;
          },
          maybeSingle: () => {
            const found = votesStore.find(
              (v) => (!filterReportId || v.report_id === filterReportId) && (!filterUserId || v.user_id === filterUserId)
            );
            return Promise.resolve({ data: found ? { id: "vote-uuid" } : null, error: null });
          },
          insert: (row: { report_id: string; user_id: string }) => {
            // Check composite unique constraint (report_id, user_id)
            const exists = votesStore.some((v) => v.report_id === row.report_id && v.user_id === row.user_id);
            if (exists) {
              return Promise.resolve({
                data: null,
                error: { message: "duplicate key value violates unique constraint report_votes_once", code: "23505" },
              });
            }
            votesStore.push(row);
            return Promise.resolve({ data: null, error: null });
          },
        };
        return builder;
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient & { _votesStore: { report_id: string; user_id: string }[] };
}

// =========================================================================
// SECTION 1: Request Validation & UUID Tests
// =========================================================================

test("Validation 01: Valid report UUID v4 is accepted", () => {
  const result = reportIdParamSchema.safeParse(VALID_REPORT_ID);
  assert.equal(result.success, true);
});

test("Validation 02: Invalid report UUID format is rejected with validation error", () => {
  const result = reportIdParamSchema.safeParse("not-a-valid-uuid");
  assert.equal(result.success, false);
});

test("Validation 03: Empty request body passes strict schema", () => {
  const result = upvoteBodySchema.safeParse({});
  assert.equal(result.success, true);
});

test("Validation 04: Client-injected user_id or vote_count is strictly rejected", () => {
  const resultWithUser = upvoteBodySchema.safeParse({ user_id: CITIZEN_SUPPORTER_1.id });
  assert.equal(resultWithUser.success, false);

  const resultWithCount = upvoteBodySchema.safeParse({ vote_count: 50 });
  assert.equal(resultWithCount.success, false);

  const resultWithRole = upvoteBodySchema.safeParse({ role: "admin" });
  assert.equal(resultWithRole.success, false);

  const resultWithPriority = upvoteBodySchema.safeParse({ priority_score: 100 });
  assert.equal(resultWithPriority.success, false);
});

// =========================================================================
// SECTION 2: Authentication & Authorization Tests
// =========================================================================

test("Auth 01: Missing or unauthenticated caller throws UNAUTHORIZED (401)", async () => {
  const mockClient = createMockVoteClient([]);

  await assert.rejects(
    async () => {
      // @ts-expect-error - testing missing caller
      await supportReport(VALID_REPORT_ID, null, mockClient);
    },
    (err: AppError) => {
      assert.equal(err.code, "UNAUTHORIZED");
      assert.equal(err.status, 401);
      return true;
    }
  );
});

test("Auth 02: Administrator accounts are forbidden from voting (403)", async () => {
  const mockClient = createMockVoteClient([
    {
      id: VALID_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "pending",
      publication: "public",
      visibility: "listed",
    },
  ]);

  await assert.rejects(
    async () => {
      await supportReport(VALID_REPORT_ID, ADMIN_USER, mockClient);
    },
    (err: AppError) => {
      assert.equal(err.code, "FORBIDDEN");
      assert.equal(err.status, 403);
      assert.match(err.message, /Administrative accounts/i);
      return true;
    }
  );
});

// =========================================================================
// SECTION 3: Self-Voting Policy Tests
// =========================================================================

test("SelfVote 01: Report creator cannot upvote their own complaint (403)", async () => {
  const mockClient = createMockVoteClient([
    {
      id: VALID_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "pending",
      publication: "public",
      visibility: "listed",
    },
  ]);

  await assert.rejects(
    async () => {
      // Alice created the report and attempts to support it
      await supportReport(VALID_REPORT_ID, CITIZEN_CREATOR, mockClient);
    },
    (err: AppError) => {
      assert.equal(err.code, "FORBIDDEN");
      assert.equal(err.status, 403);
      assert.match(err.message, /creators cannot support their own/i);
      return true;
    }
  );
});

// =========================================================================
// SECTION 4: Report Eligibility & Visibility Tests
// =========================================================================

test("Eligibility 01: Pending report is eligible for support", async () => {
  const mockClient = createMockVoteClient([
    {
      id: VALID_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "pending",
      publication: "public",
      visibility: "listed",
    },
  ]);

  const result = await supportReport(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
  assert.equal(result.supported, true);
  assert.equal(result.already_supported, false);
  assert.equal(result.support_count, 1);
});

test("Eligibility 02: In-progress report is eligible for support", async () => {
  const mockClient = createMockVoteClient([
    {
      id: VALID_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "in_progress",
      publication: "public",
      visibility: "listed",
    },
  ]);

  const result = await supportReport(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
  assert.equal(result.supported, true);
  assert.equal(result.already_supported, false);
});

test("Eligibility 03: Resolved report is ineligible for new support (409 CONFLICT)", async () => {
  const mockClient = createMockVoteClient([
    {
      id: VALID_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "resolved", // Inactive
      publication: "public",
      visibility: "listed",
    },
  ]);

  await assert.rejects(
    async () => {
      await supportReport(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
    },
    (err: AppError) => {
      assert.equal(err.code, "CONFLICT");
      assert.equal(err.status, 409);
      assert.match(err.message, /Resolved complaints/i);
      return true;
    }
  );
});

test("Visibility 01: Nonexistent report returns NOT_FOUND (404)", async () => {
  const mockClient = createMockVoteClient([]); // Empty reports store

  await assert.rejects(
    async () => {
      await supportReport(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
    },
    (err: AppError) => {
      assert.equal(err.code, "NOT_FOUND");
      assert.equal(err.status, 404);
      return true;
    }
  );
});

test("Visibility 02: Private report belonging to another user returns NOT_FOUND (404)", async () => {
  const mockClient = createMockVoteClient([
    {
      id: VALID_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "pending",
      publication: "private",
      visibility: "hidden",
    },
  ]);

  // Bob attempts to support Alice's private hidden report
  await assert.rejects(
    async () => {
      await supportReport(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
    },
    (err: AppError) => {
      assert.equal(err.code, "NOT_FOUND");
      assert.equal(err.status, 404);
      return true;
    }
  );
});

// =========================================================================
// SECTION 5: One-User-One-Vote & Idempotency Tests
// =========================================================================

test("OneVote 01: First support creates exactly one vote and returns already_supported: false", async () => {
  const mockClient = createMockVoteClient([
    {
      id: VALID_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "pending",
      publication: "public",
      visibility: "listed",
    },
  ]);

  const res1 = await supportReport(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
  assert.equal(res1.report_id, VALID_REPORT_ID);
  assert.equal(res1.supported, true);
  assert.equal(res1.already_supported, false);
  assert.equal(res1.support_count, 1);
  assert.equal(mockClient._votesStore.length, 1);
});

test("OneVote 02: Repeated support by same citizen returns already_supported: true without duplicate insertion", async () => {
  const mockClient = createMockVoteClient([
    {
      id: VALID_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "pending",
      publication: "public",
      visibility: "listed",
    },
  ]);

  // First vote
  const res1 = await supportReport(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
  assert.equal(res1.already_supported, false);
  assert.equal(res1.support_count, 1);

  // Second vote (repeat click)
  const res2 = await supportReport(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
  assert.equal(res2.supported, true);
  assert.equal(res2.already_supported, true);
  assert.equal(res2.support_count, 1); // Count does NOT increment
  assert.equal(mockClient._votesStore.length, 1); // Stored records remain 1
});

test("OneVote 03: Distinct citizens can each support the report, incrementing total count", async () => {
  const mockClient = createMockVoteClient([
    {
      id: VALID_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "pending",
      publication: "public",
      visibility: "listed",
    },
  ]);

  // Bob supports
  const resBob = await supportReport(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
  assert.equal(resBob.support_count, 1);

  // Carol supports
  const resCarol = await supportReport(VALID_REPORT_ID, CITIZEN_SUPPORTER_2, mockClient);
  assert.equal(resCarol.support_count, 2);
  assert.equal(mockClient._votesStore.length, 2);
});

test("OneVote 04: One citizen can support multiple different reports", async () => {
  const mockClient = createMockVoteClient([
    {
      id: VALID_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "pending",
      publication: "public",
      visibility: "listed",
    },
    {
      id: SECOND_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "in_progress",
      publication: "public",
      visibility: "listed",
    },
  ]);

  // Bob supports Report 1
  const res1 = await supportReport(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
  assert.equal(res1.supported, true);

  // Bob supports Report 2
  const res2 = await supportReport(SECOND_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
  assert.equal(res2.supported, true);
  assert.equal(mockClient._votesStore.length, 2);
});

// =========================================================================
// SECTION 6: Concurrency Safety Tests
// =========================================================================

test("Concurrency 01: Concurrent duplicate requests from same citizen create exactly one vote row", async () => {
  const mockClient = createMockVoteClient([
    {
      id: VALID_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "pending",
      publication: "public",
      visibility: "listed",
    },
  ]);

  // Simulate 5 simultaneous clicks
  const promises = Array.from({ length: 5 }, () =>
    supportReport(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient)
  );

  const results = await Promise.all(promises);

  // Exactly one should have already_supported = false; the rest true
  const initialSupports = results.filter((r) => !r.already_supported);
  const repeatedSupports = results.filter((r) => r.already_supported);

  assert.equal(initialSupports.length, 1);
  assert.equal(repeatedSupports.length, 4);
  assert.equal(mockClient._votesStore.length, 1);
});

test("Concurrency 02: Concurrent requests from multiple distinct citizens all succeed", async () => {
  const mockClient = createMockVoteClient([
    {
      id: VALID_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "pending",
      publication: "public",
      visibility: "listed",
    },
  ]);

  const [res1, res2] = await Promise.all([
    supportReport(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient),
    supportReport(VALID_REPORT_ID, CITIZEN_SUPPORTER_2, mockClient),
  ]);

  assert.equal(res1.supported, true);
  assert.equal(res2.supported, true);
  assert.equal(mockClient._votesStore.length, 2);
});

// =========================================================================
// SECTION 7: Support Summary & can_support Calculation Tests
// =========================================================================

test("Summary 01: getReportSupportSummary computes accurate count and can_support for eligible citizen", async () => {
  const mockClient = createMockVoteClient(
    [
      {
        id: VALID_REPORT_ID,
        user_id: CITIZEN_CREATOR.id,
        status: "pending",
        publication: "public",
        visibility: "listed",
      },
    ],
    [
      { report_id: VALID_REPORT_ID, user_id: "other-user-uuid" },
    ]
  );

  const summary = await getReportSupportSummary(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
  assert.equal(summary.report_id, VALID_REPORT_ID);
  assert.equal(summary.support_count, 1);
  assert.equal(summary.current_user_supported, false);
  assert.equal(summary.can_support, true);
});

test("Summary 02: getReportSupportSummary returns current_user_supported: true and can_support: false if already voted", async () => {
  const mockClient = createMockVoteClient(
    [
      {
        id: VALID_REPORT_ID,
        user_id: CITIZEN_CREATOR.id,
        status: "pending",
        publication: "public",
        visibility: "listed",
      },
    ],
    [
      { report_id: VALID_REPORT_ID, user_id: CITIZEN_SUPPORTER_1.id },
    ]
  );

  const summary = await getReportSupportSummary(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
  assert.equal(summary.support_count, 1);
  assert.equal(summary.current_user_supported, true);
  assert.equal(summary.can_support, false);
});

test("Summary 03: getReportSupportSummary returns can_support: false for report creator", async () => {
  const mockClient = createMockVoteClient([
    {
      id: VALID_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "pending",
      publication: "public",
      visibility: "listed",
    },
  ]);

  const summary = await getReportSupportSummary(VALID_REPORT_ID, CITIZEN_CREATOR, mockClient);
  assert.equal(summary.can_support, false); // Creator cannot support own report
});

test("Summary 04: getReportSupportSummary returns can_support: false for resolved report", async () => {
  const mockClient = createMockVoteClient(
    [
      {
        id: VALID_REPORT_ID,
        user_id: CITIZEN_CREATOR.id,
        status: "resolved",
        publication: "public",
        visibility: "listed",
      },
    ],
    [
      { report_id: VALID_REPORT_ID, user_id: "historical-voter-uuid" },
    ]
  );

  const summary = await getReportSupportSummary(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
  assert.equal(summary.support_count, 1); // Historical count preserved
  assert.equal(summary.can_support, false); // Ineligible
});

test("Summary 05: Anonymous visitor sees total support count with can_support: false", async () => {
  const mockClient = createMockVoteClient(
    [
      {
        id: VALID_REPORT_ID,
        user_id: CITIZEN_CREATOR.id,
        status: "pending",
        publication: "public",
        visibility: "listed",
      },
    ],
    [
      { report_id: VALID_REPORT_ID, user_id: "voter-1" },
      { report_id: VALID_REPORT_ID, user_id: "voter-2" },
    ]
  );

  // Anonymous visitor (caller is null)
  const summary = await getReportSupportSummary(VALID_REPORT_ID, null, mockClient);
  assert.equal(summary.support_count, 2);
  assert.equal(summary.current_user_supported, false);
  assert.equal(summary.can_support, false);
});

test("Summary 06: Anonymous visitor querying private report receives NOT_FOUND (404)", async () => {
  const mockClient = createMockVoteClient([
    {
      id: VALID_REPORT_ID,
      user_id: CITIZEN_CREATOR.id,
      status: "pending",
      publication: "private",
      visibility: "hidden",
    },
  ]);

  await assert.rejects(
    async () => {
      await getReportSupportSummary(VALID_REPORT_ID, null, mockClient);
    },
    (err: AppError) => {
      assert.equal(err.code, "NOT_FOUND");
      assert.equal(err.status, 404);
      return true;
    }
  );
});

// =========================================================================
// SECTION 8: Route Handler Contract & Response Envelopes
// =========================================================================

test("RouteContract 01: First successful upvote produces HTTP 201 with standard envelope and no-store", async () => {
  const payload = {
    report_id: VALID_REPORT_ID,
    supported: true,
    already_supported: false,
    support_count: 5,
  };

  const response = successResponse(payload, {
    status: 201,
    message: "Complaint supported successfully",
  });

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("Cache-Control"), "no-store");

  const json = await response.json();
  assert.equal(json.success, true);
  assert.equal(json.message, "Complaint supported successfully");
  assert.equal(json.data.already_supported, false);
  assert.equal(json.data.support_count, 5);
});

test("RouteContract 02: Repeated upvote produces HTTP 200 with already_supported: true and no-store", async () => {
  const payload = {
    report_id: VALID_REPORT_ID,
    supported: true,
    already_supported: true,
    support_count: 5,
  };

  const response = successResponse(payload, {
    status: 200,
    message: "You have already supported this complaint",
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");

  const json = await response.json();
  assert.equal(json.success, true);
  assert.equal(json.message, "You have already supported this complaint");
  assert.equal(json.data.already_supported, true);
});

test("RouteContract 03: Support summary GET produces HTTP 200 with no-store", async () => {
  const summary = {
    report_id: VALID_REPORT_ID,
    support_count: 8,
    current_user_supported: false,
    can_support: true,
  };

  const response = successResponse(summary, {
    status: 200,
    message: "Support information retrieved successfully",
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");

  const json = await response.json();
  assert.equal(json.data.support_count, 8);
  assert.equal(json.data.can_support, true);
});

test("RouteContract 04: Error response contract maps FORBIDDEN to 403 with no-store", () => {
  const err = new AppError("FORBIDDEN", "Report creators cannot support their own complaints");
  const response = errorResponse(err);

  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("RouteContract 05: Error response contract maps CONFLICT to 409 with no-store", () => {
  const err = new AppError("CONFLICT", "Resolved complaints are not eligible for community support");
  const response = errorResponse(err);

  assert.equal(response.status, 409);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("RouteContract 06: Data projection strictly omits voter identities and private user data", async () => {
  const mockClient = createMockVoteClient(
    [
      {
        id: VALID_REPORT_ID,
        user_id: CITIZEN_CREATOR.id,
        status: "pending",
        publication: "public",
        visibility: "listed",
      },
    ],
    [
      { report_id: VALID_REPORT_ID, user_id: CITIZEN_SUPPORTER_1.id },
    ]
  );

  const summary = await getReportSupportSummary(VALID_REPORT_ID, CITIZEN_SUPPORTER_1, mockClient);
  const raw = summary as Record<string, unknown>;

  assert.equal(raw.voters, undefined);
  assert.equal(raw.user_ids, undefined);
  assert.equal(raw.emails, undefined);
  assert.equal(raw.profiles, undefined);
});
