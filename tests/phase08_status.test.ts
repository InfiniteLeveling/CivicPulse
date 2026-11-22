import test from "node:test";
import assert from "node:assert/strict";

import {
  updateStatusSchema,
  reportIdSchema,
} from "../src/validators/status.schema.ts";
import {
  assertValidStatusTransition,
  updateReportStatus,
  getReportStatusHistory,
} from "../src/services/status.service.ts";
import { AppError } from "../src/utils/app-error.ts";
import type { AuthenticatedUser } from "../src/types/auth.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

const CITIZEN_A: AuthenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "citizen_a@example.com",
  full_name: "Citizen One",
  role: "citizen",
};

const CITIZEN_B: AuthenticatedUser = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "citizen_b@example.com",
  full_name: "Citizen Two",
  role: "citizen",
};

const ADMIN_USER: AuthenticatedUser = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "admin@example.com",
  full_name: "Admin User",
  role: "admin",
};

const VALID_REPORT_ID = "44444444-4444-4444-8444-444444444444";

// --- State Machine & Transition Matrix Tests ---

test("1. State machine permits pending -> in_progress transition", () => {
  assert.doesNotThrow(() => {
    assertValidStatusTransition("pending", "in_progress");
  });
});

test("2. State machine permits in_progress -> resolved transition", () => {
  assert.doesNotThrow(() => {
    assertValidStatusTransition("in_progress", "resolved");
  });
});

test("3. State machine rejects pending -> resolved transition (skipping in_progress)", () => {
  assert.throws(
    () => assertValidStatusTransition("pending", "resolved"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      assert.equal(err.status, 409);
      return true;
    }
  );
});

test("4. State machine rejects resolved -> pending transition (reopening not permitted in MVP)", () => {
  assert.throws(
    () => assertValidStatusTransition("resolved", "pending"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      assert.equal(err.status, 409);
      return true;
    }
  );
});

test("5. State machine rejects resolved -> in_progress transition", () => {
  assert.throws(
    () => assertValidStatusTransition("resolved", "in_progress"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      assert.equal(err.status, 409);
      return true;
    }
  );
});

test("6. State machine rejects in_progress -> pending backwards transition", () => {
  assert.throws(
    () => assertValidStatusTransition("in_progress", "pending"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      assert.equal(err.status, 409);
      return true;
    }
  );
});

test("7. State machine rejects same-status transition pending -> pending", () => {
  assert.throws(
    () => assertValidStatusTransition("pending", "pending"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      assert.match(err.message, /already in status 'pending'/);
      return true;
    }
  );
});

test("8. State machine rejects same-status transition in_progress -> in_progress", () => {
  assert.throws(
    () => assertValidStatusTransition("in_progress", "in_progress"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      assert.match(err.message, /already in status 'in_progress'/);
      return true;
    }
  );
});

test("9. State machine rejects same-status transition resolved -> resolved", () => {
  assert.throws(
    () => assertValidStatusTransition("resolved", "resolved"),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      assert.match(err.message, /already in status 'resolved'/);
      return true;
    }
  );
});

// --- Schema Validation Tests ---

test("10. Valid update status payload with status only passes validation", () => {
  const result = updateStatusSchema.safeParse({ status: "in_progress" });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.status, "in_progress");
    assert.equal(result.data.notes, undefined);
    assert.equal(result.data.expected_status, undefined);
  }
});

test("11. Valid update status payload with notes and expected_status passes validation", () => {
  const result = updateStatusSchema.safeParse({
    status: "in_progress",
    notes: "Assigned inspection team to site.",
    expected_status: "pending",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.status, "in_progress");
    assert.equal(result.data.notes, "Assigned inspection team to site.");
    assert.equal(result.data.expected_status, "pending");
  }
});

test("12. Notes exceeding 1000 characters is rejected", () => {
  const result = updateStatusSchema.safeParse({
    status: "in_progress",
    notes: "A".repeat(1001),
  });
  assert.equal(result.success, false);
});

test("13. Notes with leading or trailing whitespace is trimmed", () => {
  const result = updateStatusSchema.safeParse({
    status: "in_progress",
    notes: "  Road repair started   ",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.notes, "Road repair started");
  }
});

test("14. Empty notes string normalizes to undefined", () => {
  const result = updateStatusSchema.safeParse({
    status: "in_progress",
    notes: "   ",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.notes, undefined);
  }
});

test("15. Invalid status value is rejected", () => {
  const result = updateStatusSchema.safeParse({ status: "cancelled" });
  assert.equal(result.success, false);
});

test("16. Missing status field is rejected", () => {
  const result = updateStatusSchema.safeParse({ notes: "Some notes" });
  assert.equal(result.success, false);
});

test("17. Invalid expected_status is rejected", () => {
  const result = updateStatusSchema.safeParse({
    status: "in_progress",
    expected_status: "abandoned",
  });
  assert.equal(result.success, false);
});

test("18. Forbidden field injection: changed_by is rejected by strict schema", () => {
  const result = updateStatusSchema.safeParse({
    status: "in_progress",
    changed_by: "33333333-3333-4333-8333-333333333333",
  });
  assert.equal(result.success, false);
});

test("19. Forbidden field injection: user_id is rejected by strict schema", () => {
  const result = updateStatusSchema.safeParse({
    status: "in_progress",
    user_id: "33333333-3333-4333-8333-333333333333",
  });
  assert.equal(result.success, false);
});

test("20. Forbidden field injection: resolved_at is rejected by strict schema", () => {
  const result = updateStatusSchema.safeParse({
    status: "resolved",
    resolved_at: "2026-11-21T10:00:00.000Z",
  });
  assert.equal(result.success, false);
});

test("21. Forbidden field injection: role is rejected by strict schema", () => {
  const result = updateStatusSchema.safeParse({
    status: "in_progress",
    role: "admin",
  });
  assert.equal(result.success, false);
});

test("22. Report ID schema validates valid UUID v4 and rejects malformed strings", () => {
  const valid = reportIdSchema.safeParse(VALID_REPORT_ID);
  assert.equal(valid.success, true);

  const invalid = reportIdSchema.safeParse("not-a-valid-uuid");
  assert.equal(invalid.success, false);
});

// --- Service Authorization & Update Tests ---

test("23. updateReportStatus throws 403 FORBIDDEN when citizen attempts status modification", async () => {
  await assert.rejects(
    async () => {
      await updateReportStatus(VALID_REPORT_ID, { status: "in_progress" }, CITIZEN_A);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      assert.equal(err.status, 403);
      return true;
    }
  );
});

test("24. updateReportStatus executes successfully when called by admin", async () => {
  const mockClient = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      assert.equal(fn, "civicpulse_transition_report_status");
      assert.equal(args.p_report_id, VALID_REPORT_ID);
      assert.equal(args.p_new_status, "in_progress");
      return {
        data: {
          id: VALID_REPORT_ID,
          previous_status: "pending",
          status: "in_progress",
          updated_at: "2026-11-21T12:00:00.000Z",
          resolved_at: null,
          history_entry_id: "55555555-5555-5555-8555-555555555555",
          version: 2,
        },
        error: null,
      };
    },
  } as unknown as SupabaseClient;

  const result = await updateReportStatus(
    VALID_REPORT_ID,
    { status: "in_progress", notes: "Working on it" },
    ADMIN_USER,
    mockClient
  );

  assert.equal(result.id, VALID_REPORT_ID);
  assert.equal(result.previous_status, "pending");
  assert.equal(result.status, "in_progress");
  assert.equal(result.resolved_at, null);
  assert.equal(result.version, 2);
});

test("25. updateReportStatus maps RPC 23514 / STATUS_CONFLICT to 409 CONFLICT", async () => {
  const mockClient = {
    rpc: async () => ({
      data: null,
      error: {
        code: "23514",
        message: "STATUS_CONFLICT: Complaint status changed. Expected pending but current status is in_progress",
      },
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await updateReportStatus(
        VALID_REPORT_ID,
        { status: "in_progress", expected_status: "pending" },
        ADMIN_USER,
        mockClient
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      assert.equal(err.status, 409);
      return true;
    }
  );
});

test("26. updateReportStatus maps RPC P0002 / NOT_FOUND to 404 NOT_FOUND", async () => {
  const mockClient = {
    rpc: async () => ({
      data: null,
      error: { code: "P0002", message: "NOT_FOUND: Report not found" },
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await updateReportStatus(
        VALID_REPORT_ID,
        { status: "in_progress" },
        ADMIN_USER,
        mockClient
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "NOT_FOUND");
      assert.equal(err.status, 404);
      return true;
    }
  );
});

// --- Timeline & History Retrieval Tests ---

test("27. getReportStatusHistory throws 404 NOT_FOUND when report does not exist", async () => {
  const mockClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await getReportStatusHistory(VALID_REPORT_ID, CITIZEN_A, mockClient);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "NOT_FOUND");
      assert.equal(err.status, 404);
      return true;
    }
  );
});

test("28. getReportStatusHistory conceals private report from anonymous visitor with 404 NOT_FOUND", async () => {
  const mockClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: VALID_REPORT_ID,
              status: "pending",
              publication: "private",
              visibility: "listed",
              user_id: CITIZEN_A.id,
            },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await getReportStatusHistory(VALID_REPORT_ID, null, mockClient);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "NOT_FOUND");
      assert.equal(err.status, 404);
      return true;
    }
  );
});

test("29. getReportStatusHistory conceals private report from non-owner citizen with 404 NOT_FOUND", async () => {
  const mockClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: VALID_REPORT_ID,
              status: "pending",
              publication: "private",
              visibility: "listed",
              user_id: CITIZEN_A.id,
            },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await getReportStatusHistory(VALID_REPORT_ID, CITIZEN_B, mockClient);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "NOT_FOUND");
      assert.equal(err.status, 404);
      return true;
    }
  );
});

test("30. getReportStatusHistory permits public listed report to anonymous visitor (excluding notes & actor)", async () => {
  const mockClient = {
    from: (table: string) => {
      if (table === "reports") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: VALID_REPORT_ID,
                  status: "in_progress",
                  publication: "public",
                  visibility: "listed",
                  user_id: CITIZEN_A.id,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "status_history") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: async () => ({
                  data: [
                    {
                      id: "hist-1",
                      report_id: VALID_REPORT_ID,
                      version: 1,
                      previous_status: null,
                      status: "pending",
                      created_at: "2026-11-21T10:00:00.000Z",
                    },
                    {
                      id: "hist-2",
                      report_id: VALID_REPORT_ID,
                      version: 2,
                      previous_status: "pending",
                      status: "in_progress",
                      created_at: "2026-11-21T11:00:00.000Z",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  const result = await getReportStatusHistory(VALID_REPORT_ID, null, mockClient);

  assert.equal(result.report_id, VALID_REPORT_ID);
  assert.equal(result.current_status, "in_progress");
  assert.equal(result.history.length, 2);
  assert.equal(result.history[0].status, "pending");
  assert.equal(result.history[0].notes, undefined);
  assert.equal(result.history[0].changed_by, undefined);
  assert.equal(result.history[1].status, "in_progress");
  assert.equal(result.history[1].notes, undefined);
  assert.equal(result.history[1].changed_by, undefined);
});

test("31. getReportStatusHistory permits owner to view private complaint history (excluding internal notes)", async () => {
  const mockClient = {
    from: (table: string) => {
      if (table === "reports") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: VALID_REPORT_ID,
                  status: "pending",
                  publication: "private",
                  visibility: "listed",
                  user_id: CITIZEN_A.id,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "status_history") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: async () => ({
                  data: [
                    {
                      id: "hist-1",
                      report_id: VALID_REPORT_ID,
                      version: 1,
                      previous_status: null,
                      status: "pending",
                      created_at: "2026-11-21T10:00:00.000Z",
                    },
                  ],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  const result = await getReportStatusHistory(VALID_REPORT_ID, CITIZEN_A, mockClient);

  assert.equal(result.report_id, VALID_REPORT_ID);
  assert.equal(result.current_status, "pending");
  assert.equal(result.history.length, 1);
  assert.equal(result.history[0].notes, undefined);
  assert.equal(result.history[0].changed_by, undefined);
});

test("32. getReportStatusHistory gives admin full timeline including notes and actor UUID", async () => {
  const mockClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: VALID_REPORT_ID,
              status: "in_progress",
              publication: "public",
              visibility: "listed",
              user_id: CITIZEN_A.id,
            },
            error: null,
          }),
        }),
      }),
    }),
    rpc: async (fn: string) => {
      assert.equal(fn, "civicpulse_get_admin_status_history");
      return {
        data: [
          {
            id: "hist-1",
            report_id: VALID_REPORT_ID,
            version: 1,
            previous_status: null,
            status: "pending",
            changed_by: CITIZEN_A.id,
            notes: null,
            created_at: "2026-11-21T10:00:00.000Z",
          },
          {
            id: "hist-2",
            report_id: VALID_REPORT_ID,
            version: 2,
            previous_status: "pending",
            status: "in_progress",
            changed_by: ADMIN_USER.id,
            notes: "Internal staff inspection dispatched.",
            created_at: "2026-11-21T11:00:00.000Z",
          },
        ],
        error: null,
      };
    },
  } as unknown as SupabaseClient;

  const result = await getReportStatusHistory(VALID_REPORT_ID, ADMIN_USER, mockClient);

  assert.equal(result.report_id, VALID_REPORT_ID);
  assert.equal(result.history.length, 2);
  assert.equal(result.history[1].notes, "Internal staff inspection dispatched.");
  assert.equal(result.history[1].changed_by, ADMIN_USER.id);
});

test("33. getReportStatusHistory handles empty history array gracefully", async () => {
  const mockClient = {
    from: (table: string) => {
      if (table === "reports") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: VALID_REPORT_ID,
                  status: "pending",
                  publication: "public",
                  visibility: "listed",
                  user_id: CITIZEN_A.id,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "status_history") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                order: async () => ({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table: ${table}`);
    },
  } as unknown as SupabaseClient;

  const result = await getReportStatusHistory(VALID_REPORT_ID, null, mockClient);

  assert.equal(result.report_id, VALID_REPORT_ID);
  assert.equal(result.history.length, 0);
  assert.deepEqual(result.history, []);
});
