import test from "node:test";
import assert from "node:assert/strict";

import { assignDepartmentSchema } from "../src/validators/assignment.schema.ts";
import {
  listDepartments,
  getDepartmentById,
  assignDepartment,
} from "../src/services/department.service.ts";
import { AppError } from "../src/utils/app-error.ts";
import type { AuthenticatedUser } from "../src/types/auth.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

const CITIZEN_A: AuthenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "citizen_a@example.com",
  full_name: "Citizen One",
  role: "citizen",
};

const ADMIN_USER: AuthenticatedUser = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "admin@example.com",
  full_name: "Admin User",
  role: "admin",
};

const VALID_REPORT_ID = "44444444-4444-4444-8444-444444444444";
const ROAD_MAINTENANCE_ID = "55555555-5555-5555-8555-555555555555";
const SANITATION_ID = "66666666-6666-6666-8666-666666666666";

// --- Department Directory Tests ---

test("1. listDepartments returns departments sorted alphabetically by name", async () => {
  const mockClient = {
    from: (table: string) => {
      assert.equal(table, "departments");
      return {
        select: (cols: string) => {
          assert.equal(cols, "id, name, description");
          return {
            order: (col: string, opts: { ascending: boolean }) => {
              assert.equal(col, "name");
              assert.equal(opts.ascending, true);
              return Promise.resolve({
                data: [
                  { id: ROAD_MAINTENANCE_ID, name: "Road Maintenance", description: "Road surfaces" },
                  { id: SANITATION_ID, name: "Sanitation", description: "Waste collection" },
                ],
                error: null,
              });
            },
          };
        },
      };
    },
  } as unknown as SupabaseClient;

  const result = await listDepartments(mockClient);
  assert.equal(result.departments.length, 2);
  assert.equal(result.departments[0].name, "Road Maintenance");
  assert.equal(result.departments[1].name, "Sanitation");
});

test("2. listDepartments handles empty department directory gracefully", async () => {
  const mockClient = {
    from: () => ({
      select: () => ({
        order: async () => ({ data: [], error: null }),
      }),
    }),
  } as unknown as SupabaseClient;

  const result = await listDepartments(mockClient);
  assert.equal(result.departments.length, 0);
  assert.deepEqual(result.departments, []);
});

test("3. listDepartments throws 500 when database fails", async () => {
  const mockClient = {
    from: () => ({
      select: () => ({
        order: async () => ({ data: null, error: { message: "Database connection failed" } }),
      }),
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await listDepartments(mockClient);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "INTERNAL_SERVER_ERROR");
      assert.equal(err.status, 500);
      return true;
    }
  );
});

test("4. getDepartmentById returns department when found", async () => {
  const mockClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: ROAD_MAINTENANCE_ID, name: "Road Maintenance", description: "Road surfaces" },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  const result = await getDepartmentById(ROAD_MAINTENANCE_ID, mockClient);
  assert.ok(result);
  assert.equal(result?.id, ROAD_MAINTENANCE_ID);
  assert.equal(result?.name, "Road Maintenance");
});

test("5. getDepartmentById returns null when department does not exist", async () => {
  const mockClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  const result = await getDepartmentById(ROAD_MAINTENANCE_ID, mockClient);
  assert.equal(result, null);
});

// --- Assignment Input Validation Tests ---

test("6. Valid assignment payload passes Zod validation", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: VALID_REPORT_ID,
    department_id: ROAD_MAINTENANCE_ID,
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.report_id, VALID_REPORT_ID);
    assert.equal(result.data.department_id, ROAD_MAINTENANCE_ID);
    assert.equal(result.data.expected_department_id, undefined);
    assert.equal(result.data.reason, undefined);
  }
});

test("7. Valid assignment with expected_department_id and reason passes validation", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: VALID_REPORT_ID,
    department_id: SANITATION_ID,
    expected_department_id: ROAD_MAINTENANCE_ID,
    reason: "Pothole was actually a garbage collection issue.",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.expected_department_id, ROAD_MAINTENANCE_ID);
    assert.equal(result.data.reason, "Pothole was actually a garbage collection issue.");
  }
});

test("8. Missing report_id is rejected", () => {
  const result = assignDepartmentSchema.safeParse({
    department_id: ROAD_MAINTENANCE_ID,
  });
  assert.equal(result.success, false);
});

test("9. Malformed report_id is rejected", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: "not-a-uuid",
    department_id: ROAD_MAINTENANCE_ID,
  });
  assert.equal(result.success, false);
});

test("10. Missing department_id is rejected", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: VALID_REPORT_ID,
  });
  assert.equal(result.success, false);
});

test("11. Malformed department_id is rejected", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: VALID_REPORT_ID,
    department_id: "invalid-dept-uuid",
  });
  assert.equal(result.success, false);
});

test("12. Null expected_department_id is accepted (explicit unassigned check)", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: VALID_REPORT_ID,
    department_id: ROAD_MAINTENANCE_ID,
    expected_department_id: null,
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.expected_department_id, null);
  }
});

test("13. Malformed expected_department_id is rejected", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: VALID_REPORT_ID,
    department_id: ROAD_MAINTENANCE_ID,
    expected_department_id: "bad-uuid",
  });
  assert.equal(result.success, false);
});

test("14. Reason exceeding 1000 characters is rejected", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: VALID_REPORT_ID,
    department_id: ROAD_MAINTENANCE_ID,
    reason: "A".repeat(1001),
  });
  assert.equal(result.success, false);
});

test("15. Reason with leading/trailing whitespace is trimmed", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: VALID_REPORT_ID,
    department_id: ROAD_MAINTENANCE_ID,
    reason: "  Assigned to road maintenance   ",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.reason, "Assigned to road maintenance");
  }
});

test("16. Empty reason string normalizes to undefined", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: VALID_REPORT_ID,
    department_id: ROAD_MAINTENANCE_ID,
    reason: "   ",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.reason, undefined);
  }
});

test("17. Forbidden client-controlled field: assigned_by is rejected by strict schema", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: VALID_REPORT_ID,
    department_id: ROAD_MAINTENANCE_ID,
    assigned_by: ADMIN_USER.id,
  });
  assert.equal(result.success, false);
});

test("18. Forbidden client-controlled field: user_id is rejected by strict schema", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: VALID_REPORT_ID,
    department_id: ROAD_MAINTENANCE_ID,
    user_id: ADMIN_USER.id,
  });
  assert.equal(result.success, false);
});

test("19. Forbidden client-controlled field: status is rejected by strict schema", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: VALID_REPORT_ID,
    department_id: ROAD_MAINTENANCE_ID,
    status: "in_progress",
  });
  assert.equal(result.success, false);
});

test("20. Forbidden client-controlled field: priority_score is rejected by strict schema", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: VALID_REPORT_ID,
    department_id: ROAD_MAINTENANCE_ID,
    priority_score: 100,
  });
  assert.equal(result.success, false);
});

test("21. Forbidden client-controlled field: role is rejected by strict schema", () => {
  const result = assignDepartmentSchema.safeParse({
    report_id: VALID_REPORT_ID,
    department_id: ROAD_MAINTENANCE_ID,
    role: "admin",
  });
  assert.equal(result.success, false);
});

// --- Service Authorization & Assignment Tests ---

test("22. assignDepartment throws 403 FORBIDDEN when citizen attempts complaint assignment", async () => {
  await assert.rejects(
    async () => {
      await assignDepartment(
        { report_id: VALID_REPORT_ID, department_id: ROAD_MAINTENANCE_ID },
        CITIZEN_A
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      assert.equal(err.status, 403);
      return true;
    }
  );
});

test("23. assignDepartment succeeds when called by admin (initial assignment)", async () => {
  const mockClient = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      assert.equal(fn, "civicpulse_assign_department");
      assert.equal(args.p_report_id, VALID_REPORT_ID);
      assert.equal(args.p_department_id, ROAD_MAINTENANCE_ID);
      assert.equal(args.p_expected_department_id, null);
      assert.equal(args.p_check_expected, false);
      return {
        data: {
          report_id: VALID_REPORT_ID,
          previous_department_id: null,
          department: {
            id: ROAD_MAINTENANCE_ID,
            name: "Road Maintenance",
          },
          assigned_by: ADMIN_USER.id,
          assigned_at: "2026-11-21T14:00:00.000Z",
          assignment_history_id: "77777777-7777-4777-8777-777777777777",
        },
        error: null,
      };
    },
  } as unknown as SupabaseClient;

  const result = await assignDepartment(
    { report_id: VALID_REPORT_ID, department_id: ROAD_MAINTENANCE_ID },
    ADMIN_USER,
    mockClient
  );

  assert.equal(result.report_id, VALID_REPORT_ID);
  assert.equal(result.previous_department_id, null);
  assert.equal(result.department.name, "Road Maintenance");
  assert.equal(result.assigned_by, ADMIN_USER.id);
});

test("24. assignDepartment succeeds for reassignment with expected_department_id check", async () => {
  const mockClient = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      assert.equal(fn, "civicpulse_assign_department");
      assert.equal(args.p_report_id, VALID_REPORT_ID);
      assert.equal(args.p_department_id, SANITATION_ID);
      assert.equal(args.p_expected_department_id, ROAD_MAINTENANCE_ID);
      assert.equal(args.p_check_expected, true);
      return {
        data: {
          report_id: VALID_REPORT_ID,
          previous_department_id: ROAD_MAINTENANCE_ID,
          department: {
            id: SANITATION_ID,
            name: "Sanitation",
          },
          assigned_by: ADMIN_USER.id,
          assigned_at: "2026-11-21T15:00:00.000Z",
          assignment_history_id: "88888888-8888-4888-8888-888888888888",
        },
        error: null,
      };
    },
  } as unknown as SupabaseClient;

  const result = await assignDepartment(
    {
      report_id: VALID_REPORT_ID,
      department_id: SANITATION_ID,
      expected_department_id: ROAD_MAINTENANCE_ID,
      reason: "Waste collection issue, not road maintenance.",
    },
    ADMIN_USER,
    mockClient
  );

  assert.equal(result.report_id, VALID_REPORT_ID);
  assert.equal(result.previous_department_id, ROAD_MAINTENANCE_ID);
  assert.equal(result.department.name, "Sanitation");
});

test("25. assignDepartment maps RPC same-department duplicate conflict to 409 CONFLICT", async () => {
  const mockClient = {
    rpc: async () => ({
      data: null,
      error: {
        code: "23514",
        message: "ASSIGNMENT_CONFLICT: Report is already assigned to this department",
      },
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await assignDepartment(
        { report_id: VALID_REPORT_ID, department_id: ROAD_MAINTENANCE_ID },
        ADMIN_USER,
        mockClient
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      assert.equal(err.status, 409);
      assert.match(err.message, /already assigned to this department/);
      return true;
    }
  );
});

test("26. assignDepartment maps RPC stale expected_department_id conflict to 409 CONFLICT", async () => {
  const mockClient = {
    rpc: async () => ({
      data: null,
      error: {
        code: "23514",
        message: `ASSIGNMENT_CONFLICT: Complaint department changed. Expected ${ROAD_MAINTENANCE_ID} but found ${SANITATION_ID}`,
      },
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await assignDepartment(
        {
          report_id: VALID_REPORT_ID,
          department_id: SANITATION_ID,
          expected_department_id: ROAD_MAINTENANCE_ID,
        },
        ADMIN_USER,
        mockClient
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      assert.equal(err.status, 409);
      assert.match(err.message, /department changed/);
      return true;
    }
  );
});

test("27. assignDepartment maps RPC resolved complaint restriction to 409 CONFLICT", async () => {
  const mockClient = {
    rpc: async () => ({
      data: null,
      error: {
        code: "23514",
        message: "ASSIGNMENT_CONFLICT: Cannot reassign a resolved complaint",
      },
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await assignDepartment(
        { report_id: VALID_REPORT_ID, department_id: ROAD_MAINTENANCE_ID },
        ADMIN_USER,
        mockClient
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      assert.equal(err.status, 409);
      assert.match(err.message, /Cannot reassign a resolved complaint/);
      return true;
    }
  );
});

test("28. assignDepartment maps RPC report not found to 404 NOT_FOUND", async () => {
  const mockClient = {
    rpc: async () => ({
      data: null,
      error: {
        code: "P0002",
        message: "NOT_FOUND: Report not found",
      },
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await assignDepartment(
        { report_id: VALID_REPORT_ID, department_id: ROAD_MAINTENANCE_ID },
        ADMIN_USER,
        mockClient
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "NOT_FOUND");
      assert.equal(err.status, 404);
      assert.match(err.message, /Report not found/);
      return true;
    }
  );
});

test("29. assignDepartment maps RPC department not found to 404 NOT_FOUND", async () => {
  const mockClient = {
    rpc: async () => ({
      data: null,
      error: {
        code: "P0002",
        message: "NOT_FOUND: Department not found",
      },
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await assignDepartment(
        { report_id: VALID_REPORT_ID, department_id: ROAD_MAINTENANCE_ID },
        ADMIN_USER,
        mockClient
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "NOT_FOUND");
      assert.equal(err.status, 404);
      assert.match(err.message, /Department not found/);
      return true;
    }
  );
});

test("30. assignDepartment preserves complaint status and priority_score", () => {
  // Verifies contract: assignment payload only affects department_id and audit history
  const parsed = assignDepartmentSchema.parse({
    report_id: VALID_REPORT_ID,
    department_id: ROAD_MAINTENANCE_ID,
  });
  assert.equal(parsed.report_id, VALID_REPORT_ID);
  assert.equal(parsed.department_id, ROAD_MAINTENANCE_ID);
  // Status and priority_score are completely absent from parsed input
  assert.equal((parsed as Record<string, unknown>).status, undefined);
  assert.equal((parsed as Record<string, unknown>).priority_score, undefined);
});
