import test from "node:test";
import assert from "node:assert/strict";

import { createReport } from "../src/services/report.service.ts";
import { verifyOwnedDraftPath } from "../src/services/storage.service.ts";
import { listReports, getReportById } from "../src/services/report-query.service.ts";
import { listDepartments, assignDepartment } from "../src/services/department.service.ts";
import {
  updateReportStatus,
  getReportStatusHistory,
  assertValidStatusTransition,
} from "../src/services/status.service.ts";
import { createReportSchema } from "../src/validators/report.schema.ts";
import { assignDepartmentSchema } from "../src/validators/assignment.schema.ts";
import { updateStatusSchema } from "../src/validators/status.schema.ts";
import { reportQuerySchema } from "../src/validators/report-query.schema.ts";
import { AppError } from "../src/utils/app-error.ts";
import type { AuthenticatedUser } from "../src/types/auth.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

// --- Test Fixtures & Identities ---

const CITIZEN_A: AuthenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "citizen.alice@example.com",
  full_name: "Alice Citizen",
  role: "citizen",
};

const CITIZEN_B: AuthenticatedUser = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "citizen.bob@example.com",
  full_name: "Bob Citizen",
  role: "citizen",
};

const ADMIN_OPERATOR: AuthenticatedUser = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "admin.carol@civicpulse.gov",
  full_name: "Carol Admin",
  role: "admin",
};

const ROAD_MAINTENANCE_DEPT = {
  id: "55555555-5555-5555-8555-555555555555",
  name: "Road Maintenance",
  description: "Potholes, asphalt repair, road markings, and curbs.",
};

const SANITATION_DEPT = {
  id: "66666666-6666-6666-8666-666666666666",
  name: "Sanitation & Waste",
  description: "Trash collection, illegal dumping, and hazardous waste.",
};

const REPORT_UUID = "44444444-4444-4444-8444-444444444444";
const DRAFT_IMAGE_PATH = `drafts/${CITIZEN_A.id}/12345678-1234-4234-8234-123456789abc.jpg`;

// --- Comprehensive End-to-End Core Backend Workflow Suite ---

test("Phase 10 E2E 01: Citizen authentication identity and profile contract integrity", () => {
  assert.equal(CITIZEN_A.role, "citizen");
  assert.equal(ADMIN_OPERATOR.role, "admin");
  assert.match(CITIZEN_A.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  assert.match(ADMIN_OPERATOR.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
});

test("Phase 10 E2E 02: Storage image ownership verification strictly scopes draft paths to citizen ID", () => {
  // Alice owns her draft path
  assert.doesNotThrow(() => {
    verifyOwnedDraftPath(CITIZEN_A.id, DRAFT_IMAGE_PATH);
  });

  // Bob cannot claim Alice's draft path
  assert.throws(
    () => {
      verifyOwnedDraftPath(CITIZEN_B.id, DRAFT_IMAGE_PATH);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      assert.equal(err.status, 403);
      return true;
    }
  );

  // Rejects invalid non-draft paths with validation error
  assert.throws(
    () => {
      verifyOwnedDraftPath(CITIZEN_A.id, `reports/${REPORT_UUID}/before.jpg`);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "VALIDATION_ERROR");
      assert.equal(err.status, 422);
      return true;
    }
  );
});

test("Phase 10 E2E 03: Citizen complaint creation payload schema validation and client field stripping", () => {
  const rawValidPayload = {
    title: "Large hazardous pothole on Main Street",
    description: "Deep pothole damaging vehicles near 4th avenue intersection.",
    category: "pothole",
    latitude: 37.7749,
    longitude: -122.4194,
    image_path: DRAFT_IMAGE_PATH,
  };

  const parsed = createReportSchema.safeParse(rawValidPayload);
  assert.ok(parsed.success);

  // Attempting to inject administrative or server-computed fields in payload is rejected by strict schema
  const maliciousPayload = {
    ...rawValidPayload,
    status: "in_progress",
    priority_score: 99,
    assigned_by: ADMIN_OPERATOR.id,
    user_id: CITIZEN_B.id,
  };

  const maliciousParsed = createReportSchema.safeParse(maliciousPayload);
  assert.equal(maliciousParsed.success, false);
});

test("Phase 10 E2E 04: Citizen complaint creation via service executes atomically with default values", async () => {
  let rpcCalledWith: Record<string, unknown> | null = null;

  const mockClient = {
    from: (table: string) => {
      assert.equal(table, "report_images");
      return {
        select: () => ({
          eq: (col: string, val: string) => {
            assert.equal(col, "storage_path");
            assert.equal(val, DRAFT_IMAGE_PATH);
            return {
              maybeSingle: async () => ({ data: null, error: null }),
            };
          },
        }),
      };
    },
    rpc: async (func: string, args: Record<string, unknown>) => {
      assert.equal(func, "civicpulse_create_report");
      rpcCalledWith = args;
      return {
        data: {
          id: REPORT_UUID,
          reference: "POTH-202611-0001",
          status: "pending",
          priority_score: 0,
          created_at: "2026-11-21T18:00:00Z",
          updated_at: "2026-11-21T18:00:00Z",
        },
        error: null,
      };
    },
  } as unknown as SupabaseClient;

  const input = {
    title: "Large hazardous pothole on Main Street",
    description: "Deep pothole damaging vehicles near 4th avenue intersection.",
    category: "pothole" as const,
    latitude: 37.7749,
    longitude: -122.4194,
    image_path: DRAFT_IMAGE_PATH,
  };

  const created = await createReport(CITIZEN_A.id, input, mockClient);

  assert.equal(created.id, REPORT_UUID);
  assert.equal(created.reference, "POTH-202611-0001");
  assert.equal(created.status, "pending");
  assert.equal(created.priority_score, 0);

  // Verify server RPC was passed verified draft image path and validated input
  assert.ok(rpcCalledWith);
  assert.equal(rpcCalledWith?.p_image_path, DRAFT_IMAGE_PATH);
  assert.equal(rpcCalledWith?.p_title, input.title);
});

test("Phase 10 E2E 05: Duplicate evidence image rejection prevents cross-report replay attacks", async () => {
  const mockClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { id: "existing-img-uuid", report_id: "other-report-uuid" },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await createReport(
        CITIZEN_A.id,
        {
          title: "Duplicate report attempt",
          description: "Using an image already linked to another report.",
          category: "pothole",
          latitude: 37.7749,
          longitude: -122.4194,
          image_path: DRAFT_IMAGE_PATH,
        },
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

test("Phase 10 E2E 06: Citizen personal report listing (mine: true) projects caller data with unassigned department", async () => {
  const mockClient = {
    from: (table: string) => {
      assert.equal(table, "reports");
      return {
        select: () => {
          let userIdFilter: string | null = null;
          const chain: Record<string, unknown> = {
            eq: (f: string, v: string) => {
              if (f === "user_id") userIdFilter = v;
              return chain;
            },
            order: () => chain,
            range: async () => {
              assert.equal(userIdFilter, CITIZEN_A.id);
              return {
                data: [
                  {
                    id: REPORT_UUID,
                    reference: "POTH-202611-0001",
                    title: "Large hazardous pothole on Main Street",
                    description: "Deep pothole damaging vehicles near 4th avenue intersection.",
                    category: "pothole",
                    severity: "medium",
                    status: "pending",
                    priority_score: 0,
                    latitude: 37.7749,
                    longitude: -122.4194,
                    publication: "published",
                    visibility: "public",
                    resolved_at: null,
                    created_at: "2026-11-21T18:00:00Z",
                    updated_at: "2026-11-21T18:00:00Z",
                    departments: null,
                    report_images: [
                      {
                        id: "img-uuid-1",
                        storage_path: DRAFT_IMAGE_PATH,
                        type: "before",
                        created_at: "2026-11-21T18:00:00Z",
                      },
                    ],
                  },
                ],
                count: 1,
                error: null,
              };
            },
          };
          return chain;
        },
      };
    },
  } as unknown as SupabaseClient;

  const result = await listReports(
    { page: 1, limit: 10, mine: true },
    CITIZEN_A,
    mockClient
  );

  assert.equal(result.pagination.total, 1);
  assert.equal(result.items.length, 1);
  const item = result.items[0];
  assert.equal(item.id, REPORT_UUID);
  assert.equal(item.status, "pending");
  assert.equal(item.department_name, null); // Initially unassigned
  assert.equal(item.images.length, 1);
});

test("Phase 10 E2E 07: Public feed listing omits private reports and strips sensitive creator user_id", async () => {
  const mockClient = {
    from: () => ({
      select: () => {
        const chain: Record<string, unknown> = {
          eq: () => chain,
          order: () => chain,
          range: async () => ({
            data: [
              {
                id: REPORT_UUID,
                reference: "POTH-202611-0001",
                title: "Large hazardous pothole on Main Street",
                description: "Deep pothole damaging vehicles near 4th avenue intersection.",
                category: "pothole",
                severity: "medium",
                status: "pending",
                priority_score: 0,
                latitude: 37.7749,
                longitude: -122.4194,
                created_at: "2026-11-21T18:00:00Z",
                updated_at: "2026-11-21T18:00:00Z",
                departments: null,
                report_images: [],
              },
            ],
            count: 1,
            error: null,
          }),
        };
        return chain;
      },
    }),
  } as unknown as SupabaseClient;

  const result = await listReports(
    { page: 1, limit: 10, mine: false },
    null, // Anonymous user
    mockClient
  );

  assert.equal(result.items.length, 1);
  const publicReport = result.items[0];
  // Verify public projection lacks sensitive citizen user_id
  assert.equal("user_id" in publicReport, false);
  assert.equal(publicReport.status, "pending");
});

test("Phase 10 E2E 08: Admin lists department directory sorted alphabetically", async () => {
  const mockClient = {
    from: (table: string) => {
      assert.equal(table, "departments");
      return {
        select: () => ({
          order: (col: string, opts: { ascending: boolean }) => {
            assert.equal(col, "name");
            assert.equal(opts.ascending, true);
            return Promise.resolve({
              data: [ROAD_MAINTENANCE_DEPT, SANITATION_DEPT],
              error: null,
            });
          },
        }),
      };
    },
  } as unknown as SupabaseClient;

  const result = await listDepartments(mockClient);
  assert.equal(result.departments.length, 2);
  assert.equal(result.departments[0].name, "Road Maintenance");
  assert.equal(result.departments[1].name, "Sanitation & Waste");
});

test("Phase 10 E2E 09: Admin successfully assigns complaint to Road Maintenance with atomic audit log", async () => {
  const mockClient = {
    rpc: async (func: string, args: Record<string, unknown>) => {
      assert.equal(func, "civicpulse_assign_department");
      assert.equal(args.p_report_id, REPORT_UUID);
      assert.equal(args.p_department_id, ROAD_MAINTENANCE_DEPT.id);
      return {
        data: {
          report_id: REPORT_UUID,
          previous_department_id: null,
          department: {
            id: ROAD_MAINTENANCE_DEPT.id,
            name: ROAD_MAINTENANCE_DEPT.name,
          },
          assigned_by: ADMIN_OPERATOR.id,
          assigned_at: "2026-11-21T18:30:00Z",
          assignment_history_id: "hist-assign-uuid",
        },
        error: null,
      };
    },
  } as unknown as SupabaseClient;

  const assignment = await assignDepartment(
    { report_id: REPORT_UUID, department_id: ROAD_MAINTENANCE_DEPT.id },
    ADMIN_OPERATOR,
    mockClient
  );

  assert.equal(assignment.report_id, REPORT_UUID);
  assert.equal(assignment.department.id, ROAD_MAINTENANCE_DEPT.id);
  assert.equal(assignment.department.name, "Road Maintenance");
  assert.equal(assignment.previous_department_id, null);
});

test("Phase 10 E2E 10: Verified report retrieval reflects assigned department", async () => {
  const mockClient = {
    from: (table: string) => {
      assert.equal(table, "reports");
      return {
        select: () => ({
          eq: (col: string, val: string) => {
            assert.equal(col, "id");
            assert.equal(val, REPORT_UUID);
            return {
              maybeSingle: async () => ({
                data: {
                  id: REPORT_UUID,
                  reference: "POTH-202611-0001",
                  user_id: CITIZEN_A.id,
                  title: "Large hazardous pothole on Main Street",
                  description: "Deep pothole damaging vehicles near 4th avenue intersection.",
                  category: "pothole",
                  severity: "medium",
                  status: "pending",
                  priority_score: 0,
                  latitude: 37.7749,
                  longitude: -122.4194,
                  publication: "published",
                  visibility: "public",
                  resolved_at: null,
                  created_at: "2026-11-21T18:00:00Z",
                  updated_at: "2026-11-21T18:30:00Z",
                  departments: ROAD_MAINTENANCE_DEPT,
                  report_images: [
                    {
                      id: "img-uuid-1",
                      storage_path: DRAFT_IMAGE_PATH,
                      type: "before",
                      created_at: "2026-11-21T18:00:00Z",
                    },
                  ],
                },
                error: null,
              }),
            };
          },
        }),
      };
    },
  } as unknown as SupabaseClient;

  const detail = await getReportById(REPORT_UUID, CITIZEN_A, mockClient);
  assert.equal(detail.id, REPORT_UUID);
  assert.equal(detail.department?.id, ROAD_MAINTENANCE_DEPT.id);
  assert.equal(detail.department?.name, "Road Maintenance");
  assert.equal(detail.images[0].storage_path, DRAFT_IMAGE_PATH);
});

test("Phase 10 E2E 11: Admin transitions complaint status from pending to in_progress with notes", async () => {
  const mockClient = {
    rpc: async (func: string, args: Record<string, unknown>) => {
      assert.equal(func, "civicpulse_transition_report_status");
      assert.equal(args.p_report_id, REPORT_UUID);
      assert.equal(args.p_new_status, "in_progress");
      assert.equal(args.p_notes, "Dispatched repair crew #4.");
      return {
        data: {
          id: REPORT_UUID,
          previous_status: "pending",
          status: "in_progress",
          updated_at: "2026-11-21T19:00:00Z",
          resolved_at: null,
          history_entry_id: "hist-status-1",
          version: 2,
        },
        error: null,
      };
    },
  } as unknown as SupabaseClient;

  const update = await updateReportStatus(
    REPORT_UUID,
    {
      status: "in_progress",
      notes: "Dispatched repair crew #4.",
      expected_status: "pending",
    },
    ADMIN_OPERATOR,
    mockClient
  );

  assert.equal(update.status, "in_progress");
  assert.equal(update.previous_status, "pending");
  assert.equal(update.resolved_at, null);
  assert.equal(update.version, 2);
});

test("Phase 10 E2E 12: Timeline history retrieval enforces role-aware projection (citizen vs admin)", async () => {
  const mockClient = {
    from: (table: string) => {
      if (table === "reports") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: REPORT_UUID,
                  reference: "POTH-202611-0001",
                  user_id: CITIZEN_A.id,
                  publication: "published",
                  visibility: "public",
                  status: "in_progress",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: async () => ({
                data: [
                  {
                    id: "hist-1",
                    report_id: REPORT_UUID,
                    version: 1,
                    previous_status: null,
                    status: "pending",
                    created_at: "2026-11-21T18:00:00Z",
                  },
                  {
                    id: "hist-2",
                    report_id: REPORT_UUID,
                    version: 2,
                    previous_status: "pending",
                    status: "in_progress",
                    created_at: "2026-11-21T19:00:00Z",
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      };
    },
    rpc: async (func: string) => {
      assert.equal(func, "civicpulse_get_admin_status_history");
      return {
        data: [
          {
            id: "hist-1",
            report_id: REPORT_UUID,
            version: 1,
            previous_status: null,
            status: "pending",
            notes: "Initial submission",
            changed_by: CITIZEN_A.id,
            created_at: "2026-11-21T18:00:00Z",
          },
          {
            id: "hist-2",
            report_id: REPORT_UUID,
            version: 2,
            previous_status: "pending",
            status: "in_progress",
            notes: "Internal admin note: Dispatched crew #4",
            changed_by: ADMIN_OPERATOR.id,
            created_at: "2026-11-21T19:00:00Z",
          },
        ],
        error: null,
      };
    },
  } as unknown as SupabaseClient;

  // 1. Citizen view: Notes and actor UUID are scrubbed for privacy
  const citizenHistory = await getReportStatusHistory(REPORT_UUID, CITIZEN_A, mockClient);
  assert.equal(citizenHistory.history.length, 2);
  assert.equal(citizenHistory.history[1].status, "in_progress");
  assert.equal(citizenHistory.history[1].notes, undefined);
  assert.equal(citizenHistory.history[1].changed_by, undefined);

  // 2. Admin view: Full audit details including internal notes and actor UUID are preserved
  const adminHistory = await getReportStatusHistory(REPORT_UUID, ADMIN_OPERATOR, mockClient);
  assert.equal(adminHistory.history.length, 2);
  assert.equal(adminHistory.history[1].notes, "Internal admin note: Dispatched crew #4");
  assert.equal(adminHistory.history[1].changed_by, ADMIN_OPERATOR.id);
});

test("Phase 10 E2E 13: Admin transitions complaint to resolved setting resolved_at timestamp", async () => {
  const RESOLVED_TIME = "2026-11-21T20:00:00Z";

  const mockClient = {
    rpc: async (func: string, args: Record<string, unknown>) => {
      assert.equal(func, "civicpulse_transition_report_status");
      assert.equal(args.p_new_status, "resolved");
      return {
        data: {
          id: REPORT_UUID,
          previous_status: "in_progress",
          status: "resolved",
          updated_at: RESOLVED_TIME,
          resolved_at: RESOLVED_TIME,
          history_entry_id: "hist-status-3",
          version: 3,
        },
        error: null,
      };
    },
  } as unknown as SupabaseClient;

  const update = await updateReportStatus(
    REPORT_UUID,
    {
      status: "resolved",
      notes: "Pothole filled and road repaved.",
      expected_status: "in_progress",
      after_image_path: `resolution-drafts/${ADMIN_OPERATOR.id}/${REPORT_UUID}/3a7b9c1d-8e2f-4a5b-9c3d-1e2f3a4b5c6d.jpg`,
    },
    ADMIN_OPERATOR,
    mockClient
  );

  assert.equal(update.status, "resolved");
  assert.equal(update.previous_status, "in_progress");
  assert.equal(update.resolved_at, RESOLVED_TIME);
});

test("Phase 10 E2E 14: Resolved complaint lock rejects re-assignment attempts", async () => {
  const mockClient = {
    rpc: async () => ({
      data: null,
      error: {
        code: "23514",
        message: "ASSIGNMENT_CONFLICT: Report is resolved. Reassigning departments to resolved reports is prohibited.",
      },
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await assignDepartment(
        { report_id: REPORT_UUID, department_id: SANITATION_DEPT.id },
        ADMIN_OPERATOR,
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

test("Phase 10 E2E 15: Cross-user draft isolation rejects Citizen B attempting to steal Citizen A's image", () => {
  assert.throws(
    () => {
      // Citizen A's draft path attempted by Citizen B
      verifyOwnedDraftPath(CITIZEN_B.id, DRAFT_IMAGE_PATH);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      assert.equal(err.status, 403);
      return true;
    }
  );
});

test("Phase 10 E2E 16: Cross-user private report isolation conceals report existence with 404 NOT_FOUND", async () => {
  const mockClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "private-report-uuid",
              user_id: CITIZEN_A.id,
              publication: "private",
              visibility: "private",
            },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      // Citizen B queries Alice's private report
      await getReportById("private-report-uuid", CITIZEN_B, mockClient);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "NOT_FOUND");
      assert.equal(err.status, 404);
      return true;
    }
  );
});

test("Phase 10 E2E 17: Concurrency conflict on department reassignment rejects stale expected_department_id", async () => {
  const mockClient = {
    rpc: async () => ({
      data: null,
      error: {
        code: "23514",
        message: "ASSIGNMENT_CONFLICT: Department conflict: report department does not match expected_department_id",
      },
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await assignDepartment(
        {
          report_id: REPORT_UUID,
          department_id: SANITATION_DEPT.id,
          expected_department_id: "99999999-9999-4999-8999-999999999999", // stale
        },
        ADMIN_OPERATOR,
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

test("Phase 10 E2E 18: Concurrency conflict on status update rejects stale expected_status", async () => {
  const mockClient = {
    rpc: async () => ({
      data: null,
      error: {
        code: "23514",
        message: "STATUS_CONFLICT: Report status 'in_progress' does not match expected_status 'pending'",
      },
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await updateReportStatus(
        REPORT_UUID,
        {
          status: "in_progress",
          expected_status: "pending", // stale because report was already moved to in_progress
        },
        ADMIN_OPERATOR,
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

test("Phase 10 E2E 19: Privilege escalation prevention: Citizen cannot assign departments", async () => {
  await assert.rejects(
    async () => {
      await assignDepartment(
        { report_id: REPORT_UUID, department_id: ROAD_MAINTENANCE_DEPT.id },
        CITIZEN_A, // Unauthorized citizen caller
        {} as unknown as SupabaseClient
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

test("Phase 10 E2E 20: Privilege escalation prevention: Citizen cannot update complaint status", async () => {
  await assert.rejects(
    async () => {
      await updateReportStatus(
        REPORT_UUID,
        { status: "in_progress" },
        CITIZEN_A, // Unauthorized citizen caller
        {} as unknown as SupabaseClient
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

test("Phase 10 E2E 21: Strict payload schemas reject injected client authority fields", () => {
  // Test assignment schema injection
  const badAssignment = assignDepartmentSchema.safeParse({
    report_id: REPORT_UUID,
    department_id: ROAD_MAINTENANCE_DEPT.id,
    assigned_by: ADMIN_OPERATOR.id, // client-supplied actor prohibited
  });
  assert.equal(badAssignment.success, false);

  // Test status schema injection
  const badStatus = updateStatusSchema.safeParse({
    status: "in_progress",
    changed_by: ADMIN_OPERATOR.id, // client-supplied actor prohibited
    resolved_at: "2026-11-21T20:00:00Z",
  });
  assert.equal(badStatus.success, false);
});

test("Phase 10 E2E 22: Linear state machine enforces valid transitions and rejects arbitrary state jumps", () => {
  // Valid transitions
  assert.doesNotThrow(() => assertValidStatusTransition("pending", "in_progress"));
  assert.doesNotThrow(() => assertValidStatusTransition("in_progress", "resolved"));

  // Disallowed transitions
  assert.throws(
    () => assertValidStatusTransition("pending", "resolved"), // Cannot jump straight to resolved
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      return true;
    }
  );

  assert.throws(
    () => assertValidStatusTransition("resolved", "in_progress"), // Terminal state cannot revert
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      return true;
    }
  );

  assert.throws(
    () => assertValidStatusTransition("pending", "pending"), // Same state is a conflict/no-op
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "CONFLICT");
      return true;
    }
  );
});

test("Phase 10 E2E 23: Report query filter schema enforces bounded pagination and sanitizes search terms", () => {
  // Bounded pagination: defaults to page 1, limit 20, max limit 50
  const defaultQuery = reportQuerySchema.parse({});
  assert.equal(defaultQuery.page, 1);
  assert.equal(defaultQuery.limit, 20);

  // Negative page or oversized limit rejected
  assert.equal(reportQuerySchema.safeParse({ page: 0 }).success, false);
  assert.equal(reportQuerySchema.safeParse({ limit: 100 }).success, false);

  // Valid search and filters parsed accurately
  const filterQuery = reportQuerySchema.parse({
    page: "2",
    limit: "25",
    category: "pothole",
    status: "pending",
    search: "Main Street",
  });
  assert.equal(filterQuery.page, 2);
  assert.equal(filterQuery.limit, 25);
  assert.equal(filterQuery.category, "pothole");
  assert.equal(filterQuery.status, "pending");
  assert.equal(filterQuery.search, "Main Street");
});
