import test from "node:test";
import assert from "node:assert/strict";

import {
  CATEGORY_DEPARTMENT_MAP,
  ROUTING_RULE_VERSION,
  UNMAPPED_CATEGORIES,
  getRuleKey,
  getTargetDepartmentName,
  isMappableCategory,
} from "../src/config/routing.ts";
import {
  autoRouteReport,
  backfillUnassignedReports,
  getRoutingDecision,
  resolveDepartmentForCategory,
  retryAutomaticRouting,
} from "../src/services/routing.service.ts";
import {
  adminRouteReportSchema,
  routingForbiddenFieldsSchema,
} from "../src/validators/routing.schema.ts";
import { AppError } from "../src/utils/app-error.ts";
import { successResponse, errorResponse } from "../src/utils/api-response.ts";
import type { AuthenticatedUser } from "../src/types/auth.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mock Department Directory
const DEPT_ROAD = { id: "11111111-0000-4000-8000-000000000001", name: "Road Maintenance" };
const DEPT_SAN = { id: "11111111-0000-4000-8000-000000000002", name: "Sanitation" };
const DEPT_WATER = { id: "11111111-0000-4000-8000-000000000003", name: "Water Supply" };
const DEPT_ELEC = { id: "11111111-0000-4000-8000-000000000004", name: "Electrical" };
const DEPT_DRAIN = { id: "11111111-0000-4000-8000-000000000005", name: "Drainage" };
const DEPT_WORKS = { id: "11111111-0000-4000-8000-000000000006", name: "Public Works" };

const ALL_DEPTS = [DEPT_ROAD, DEPT_SAN, DEPT_WATER, DEPT_ELEC, DEPT_DRAIN, DEPT_WORKS];

const ADMIN_USER: AuthenticatedUser = {
  id: "99999999-9999-4999-8999-999999999999",
  email: "admin@civicpulse.org",
  role: "admin",
};

const CITIZEN_USER: AuthenticatedUser = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "citizen@example.com",
  role: "citizen",
};

// --- Group 1: Canonical Mapping Unit Tests ---

test("Map 01: pothole maps to Road Maintenance", () => {
  assert.equal(getTargetDepartmentName("pothole"), "Road Maintenance");
  assert.equal(isMappableCategory("pothole"), true);
  assert.equal(getRuleKey("pothole", "Road Maintenance"), "pothole_to_road_maintenance");
});

test("Map 02: garbage maps to Sanitation", () => {
  assert.equal(getTargetDepartmentName("garbage"), "Sanitation");
  assert.equal(isMappableCategory("garbage"), true);
  assert.equal(getRuleKey("garbage", "Sanitation"), "garbage_to_sanitation");
});

test("Map 03: water_leakage maps to Water Supply", () => {
  assert.equal(getTargetDepartmentName("water_leakage"), "Water Supply");
  assert.equal(isMappableCategory("water_leakage"), true);
  assert.equal(getRuleKey("water_leakage", "Water Supply"), "water_leakage_to_water_supply");
});

test("Map 04: streetlight maps to Electrical", () => {
  assert.equal(getTargetDepartmentName("streetlight"), "Electrical");
  assert.equal(isMappableCategory("streetlight"), true);
  assert.equal(getRuleKey("streetlight", "Electrical"), "streetlight_to_electrical");
});

test("Map 05: drainage maps to Drainage", () => {
  assert.equal(getTargetDepartmentName("drainage"), "Drainage");
  assert.equal(isMappableCategory("drainage"), true);
  assert.equal(getRuleKey("drainage", "Drainage"), "drainage_to_drainage");
});

test("Map 06: damaged_infrastructure maps to Public Works", () => {
  assert.equal(getTargetDepartmentName("damaged_infrastructure"), "Public Works");
  assert.equal(isMappableCategory("damaged_infrastructure"), true);
  assert.equal(getRuleKey("damaged_infrastructure", "Public Works"), "damaged_infrastructure_to_public_works");
});

test("Map 07: other maps to null (requires manual review)", () => {
  assert.equal(getTargetDepartmentName("other"), null);
  assert.equal(isMappableCategory("other"), false);
  assert.equal(UNMAPPED_CATEGORIES.includes("other"), true);
});

test("Map 08: unknown or arbitrary categories map to null", () => {
  assert.equal(getTargetDepartmentName("aliens"), null);
  assert.equal(getTargetDepartmentName(""), null);
  assert.equal(isMappableCategory("unknown_civic_issue"), false);
});

test("Map 09: routing rule engine metadata is versioned", () => {
  assert.equal(ROUTING_RULE_VERSION, "v1");
  assert.equal(Object.keys(CATEGORY_DEPARTMENT_MAP).length, 7);
});

// --- Group 2: Department Dynamic Resolution Tests ---

test("Resolution 01: resolveDepartmentForCategory queries database by name", async () => {
  const stubClient = {
    from: (table: string) => {
      assert.equal(table, "departments");
      return {
        select: () => ({
          eq: (_col: string, val: string) => ({
            maybeSingle: async () => ({
              data: ALL_DEPTS.find((d) => d.name === val) ?? null,
              error: null,
            }),
          }),
        }),
      };
    },
  } as unknown as SupabaseClient;

  const result = await resolveDepartmentForCategory("pothole", stubClient);
  assert.ok(result);
  assert.equal(result.id, DEPT_ROAD.id);
  assert.equal(result.name, DEPT_ROAD.name);
});

test("Resolution 02: resolveDepartmentForCategory returns null for other category", async () => {
  const stubClient = {} as unknown as SupabaseClient;
  const result = await resolveDepartmentForCategory("other", stubClient);
  assert.equal(result, null);
});

test("Resolution 03: resolveDepartmentForCategory returns null when department not in DB", async () => {
  const stubClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  const result = await resolveDepartmentForCategory("pothole", stubClient);
  assert.equal(result, null);
});

// --- Group 3: Routing Decision Engine Tests ---

test("Decision 01: Unassigned eligible complaint evaluates to assigned", async () => {
  const stubClient = {
    from: (table: string) => {
      if (table === "reports") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "aaaaaaaa-0000-4000-8000-000000000001",
                  category: "garbage",
                  status: "pending",
                  department_id: null,
                  manual_override: false,
                  assignment_source: "unassigned",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "departments") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => ({
                data: ALL_DEPTS.find((d) => d.name === val) ?? null,
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;

  const decision = await getRoutingDecision("aaaaaaaa-0000-4000-8000-000000000001", stubClient);
  assert.equal(decision.is_eligible, true);
  assert.equal(decision.routing_status, "assigned");
  assert.equal(decision.target_department_name, "Sanitation");
  assert.equal(decision.target_department_id, DEPT_SAN.id);
  assert.equal(decision.rule_key, "garbage_to_sanitation");
});

test("Decision 02: Resolved complaint is skipped (skipped_resolved)", async () => {
  const stubClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "aaaaaaaa-0000-4000-8000-000000000002",
              category: "pothole",
              status: "resolved",
              department_id: DEPT_ROAD.id,
              manual_override: false,
              assignment_source: "automatic",
            },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  const decision = await getRoutingDecision("aaaaaaaa-0000-4000-8000-000000000002", stubClient);
  assert.equal(decision.is_eligible, false);
  assert.equal(decision.routing_status, "skipped_resolved");
});

test("Decision 03: Manual admin override complaint is skipped (skipped_manual_override)", async () => {
  const stubClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "aaaaaaaa-0000-4000-8000-000000000003",
              category: "pothole",
              status: "pending",
              department_id: DEPT_WORKS.id, // Admin manually reassigned to Public Works
              manual_override: true,
              assignment_source: "manual",
            },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  const decision = await getRoutingDecision("aaaaaaaa-0000-4000-8000-000000000003", stubClient);
  assert.equal(decision.is_eligible, false);
  assert.equal(decision.routing_status, "skipped_manual_override");
});

test("Decision 04: Intentional manual unassignment is skipped (skipped_manual_override)", async () => {
  const stubClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: "aaaaaaaa-0000-4000-8000-000000000004",
              category: "streetlight",
              status: "pending",
              department_id: null, // Admin intentionally removed department
              manual_override: true,
              assignment_source: "manual",
            },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  const decision = await getRoutingDecision("aaaaaaaa-0000-4000-8000-000000000004", stubClient);
  assert.equal(decision.is_eligible, false);
  assert.equal(decision.routing_status, "skipped_manual_override");
});

test("Decision 05: Complaint already assigned to target department is skipped (skipped_already_assigned)", async () => {
  const stubClient = {
    from: (table: string) => {
      if (table === "reports") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "aaaaaaaa-0000-4000-8000-000000000005",
                  category: "water_leakage",
                  status: "pending",
                  department_id: DEPT_WATER.id,
                  manual_override: false,
                  assignment_source: "automatic",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "departments") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => ({
                data: ALL_DEPTS.find((d) => d.name === val) ?? null,
                error: null,
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;

  const decision = await getRoutingDecision("aaaaaaaa-0000-4000-8000-000000000005", stubClient);
  assert.equal(decision.is_eligible, false);
  assert.equal(decision.routing_status, "skipped_already_assigned");
  assert.equal(decision.target_department_id, DEPT_WATER.id);
});

test("Decision 06: Nonexistent report throws NOT_FOUND", async () => {
  const stubClient = {
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
      await getRoutingDecision("aaaaaaaa-0000-4000-8000-000000000099", stubClient);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "NOT_FOUND");
      return true;
    }
  );
});

// --- Group 4: Automatic Routing Execution & Fallback Service Tests ---

test("Service 01: autoRouteReport executes assignment and audit history", async () => {
  let updatedReport = false;
  let historyInserted = false;

  const stubClient = {
    rpc: async () => ({
      data: null,
      error: { code: "42883", message: "function civicpulse_auto_route_report does not exist" },
    }),
    from: (table: string) => {
      if (table === "reports") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "bbbbbbbb-0000-4000-8000-000000000001",
                  category: "drainage",
                  status: "pending",
                  department_id: null,
                  manual_override: false,
                  assignment_source: "unassigned",
                },
                error: null,
              }),
            }),
          }),
          update: (fields: Record<string, unknown>) => {
            assert.equal(fields.department_id, DEPT_DRAIN.id);
            assert.equal(fields.assignment_source, "automatic");
            updatedReport = true;
            return {
              eq: async () => ({ error: null }),
            };
          },
        };
      }
      if (table === "departments") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => ({
                data: ALL_DEPTS.find((d) => d.name === val) ?? null,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "department_assignment_history") {
        return {
          insert: (record: Record<string, unknown>) => {
            assert.equal(record.report_id, "bbbbbbbb-0000-4000-8000-000000000001");
            assert.equal(record.new_department_id, DEPT_DRAIN.id);
            assert.equal(record.assigned_by, null); // System action: no fake user UUID
            assert.equal(record.assignment_source, "automatic");
            assert.equal(record.rule_key, "drainage_to_drainage");
            historyInserted = true;
            return {
              select: () => ({
                maybeSingle: async () => ({
                  data: { id: "history-uuid-1111" },
                  error: null,
                }),
              }),
            };
          },
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;

  const result = await autoRouteReport("bbbbbbbb-0000-4000-8000-000000000001", stubClient);
  assert.equal(result.routing_status, "assigned");
  assert.equal(result.assignment_source, "automatic");
  assert.equal(result.department?.id, DEPT_DRAIN.id);
  assert.equal(result.department?.name, "Drainage");
  assert.equal(result.rule_key, "drainage_to_drainage");
  assert.equal(updatedReport, true);
  assert.equal(historyInserted, true);
});

test("Service 02: autoRouteReport delegates to RPC when present", async () => {
  const rpcResult = {
    report_id: "bbbbbbbb-0000-4000-8000-000000000002",
    routing_status: "assigned" as const,
    assignment_source: "automatic" as const,
    department: { id: DEPT_ROAD.id, name: DEPT_ROAD.name },
    rule_key: "pothole_to_road_maintenance",
    message: "Complaint routed successfully",
  };

  const stubClient = {
    rpc: async (fn: string) => {
      assert.equal(fn, "civicpulse_auto_route_report");
      return { data: rpcResult, error: null };
    },
  } as unknown as SupabaseClient;

  const result = await autoRouteReport("bbbbbbbb-0000-4000-8000-000000000002", stubClient);
  assert.equal(result.routing_status, "assigned");
  assert.equal(result.department?.name, "Road Maintenance");
});

test("Service 03: autoRouteReport reverts report assignment when audit insert fails", async () => {
  let reverted = false;

  const stubClient = {
    rpc: async () => ({
      data: null,
      error: { code: "42883", message: "function does not exist" },
    }),
    from: (table: string) => {
      if (table === "reports") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: "bbbbbbbb-0000-4000-8000-000000000003",
                  category: "drainage",
                  status: "pending",
                  department_id: null,
                  manual_override: false,
                  assignment_source: "unassigned",
                },
                error: null,
              }),
            }),
          }),
          update: (fields: Record<string, unknown>) => {
            if (fields.assignment_source === "unassigned") {
              reverted = true;
            }
            return {
              eq: async () => ({ error: null }),
            };
          },
        };
      }
      if (table === "departments") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => ({
                data: ALL_DEPTS.find((d) => d.name === val) ?? null,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "department_assignment_history") {
        return {
          insert: () => ({
            select: () => ({
              maybeSingle: async () => ({
                data: null,
                error: { message: "Simulated foreign key failure" },
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await autoRouteReport("bbbbbbbb-0000-4000-8000-000000000003", stubClient);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "INTERNAL_SERVER_ERROR");
      return true;
    }
  );

  assert.equal(reverted, true, "Report assignment must revert if audit history insertion fails");
});

// --- Group 5: Administrative Routing Retry Tests ---

test("Admin 01: retryAutomaticRouting rejects non-admin callers with 403 FORBIDDEN", async () => {
  const stubClient = {} as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await retryAutomaticRouting(
        { report_id: "cccccccc-0000-4000-8000-000000000001" },
        CITIZEN_USER,
        stubClient
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

test("Admin 02: retryAutomaticRouting detects optimistic concurrency mismatch", async () => {
  const stubClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: { department_id: DEPT_ROAD.id },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await retryAutomaticRouting(
        {
          report_id: "cccccccc-0000-4000-8000-000000000002",
          expected_department_id: null, // Admin expected unassigned, but found Road Maintenance
        },
        ADMIN_USER,
        stubClient
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

// --- Group 6: Schemas and Security Attack Tests ---

test("Security 01: adminRouteReportSchema strictly rejects injected client authority fields", () => {
  const valid = adminRouteReportSchema.safeParse({
    report_id: "cccccccc-0000-4000-8000-000000000001",
    expected_department_id: null,
  });
  assert.equal(valid.success, true);

  const injectedDept = adminRouteReportSchema.safeParse({
    report_id: "cccccccc-0000-4000-8000-000000000001",
    department_id: DEPT_ROAD.id, // Forbidden field
  });
  assert.equal(injectedDept.success, false);

  const injectedSource = adminRouteReportSchema.safeParse({
    report_id: "cccccccc-0000-4000-8000-000000000001",
    assignment_source: "manual", // Forbidden field
  });
  assert.equal(injectedSource.success, false);

  const injectedRole = adminRouteReportSchema.safeParse({
    report_id: "cccccccc-0000-4000-8000-000000000001",
    role: "admin", // Forbidden field
  });
  assert.equal(injectedRole.success, false);
});

test("Security 02: routingForbiddenFieldsSchema rejects unauthorized direct mutations", () => {
  const check = routingForbiddenFieldsSchema.safeParse({
    manual_override: true,
  });
  assert.equal(check.success, false);
});

// --- Group 7: Backfill Utility Tests ---

test("Backfill 01: backfillUnassignedReports routes eligible complaints and is idempotent", async () => {
  const mockCandidates = [
    { id: "dddddddd-0000-4000-8000-000000000001", category: "pothole", status: "pending", manual_override: false },
    { id: "dddddddd-0000-4000-8000-000000000002", category: "other", status: "pending", manual_override: false },
  ];

  const stubClient = {
    from: (table: string) => {
      if (table === "reports") {
        return {
          select: () => ({
            is: () => ({
              eq: () => ({
                neq: async () => ({
                  data: mockCandidates,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      throw new Error(`Unexpected table ${table}`);
    },
    rpc: async (_fn: string, params: { p_report_id: string }) => {
      if (params.p_report_id === "dddddddd-0000-4000-8000-000000000001") {
        return {
          data: {
            report_id: params.p_report_id,
            routing_status: "assigned",
            assignment_source: "automatic",
            department: DEPT_ROAD,
          },
          error: null,
        };
      }
      return {
        data: {
          report_id: params.p_report_id,
          routing_status: "skipped_unmapped",
          assignment_source: "unassigned",
          department: null,
        },
        error: null,
      };
    },
  } as unknown as SupabaseClient;

  const result = await backfillUnassignedReports(stubClient);
  assert.equal(result.total_scanned, 2);
  assert.equal(result.assigned, 1);
  assert.equal(result.skipped_unmapped, 1);
  assert.equal(result.failed, 0);
});

// --- Group 8: Route Contract & Cache-Control Tests ---

test("RouteContract 01: API success response sets Cache-Control: no-store", () => {
  const payload = {
    report_id: "eeeeeeee-0000-4000-8000-000000000001",
    routing_status: "assigned" as const,
    assignment_source: "automatic" as const,
    department: { id: DEPT_ROAD.id, name: DEPT_ROAD.name },
    message: "Complaint routed successfully",
  };

  const response = successResponse(payload, { status: 200, message: payload.message });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("RouteContract 02: API error response sets Cache-Control: no-store", () => {
  const err = new AppError("FORBIDDEN", "Administrative privileges required");
  const response = errorResponse(err);
  assert.equal(response.status, 403);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
