import test from "node:test";
import assert from "node:assert/strict";

import {
  reportQuerySchema,
  reportIdParamSchema,
} from "../src/validators/report-query.schema.ts";
import {
  REPORT_CATEGORIES,
  REPORT_SEVERITIES,
  REPORT_SORT_OPTIONS,
  REPORT_STATUSES,
} from "../src/types/report.ts";
import {
  listReports,
  getReportById,
} from "../src/services/report-query.service.ts";
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

// --- Query Parameter Validation Tests ---

test("1. Default pagination applies page=1 and limit=20", () => {
  const result = reportQuerySchema.safeParse({});
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.page, 1);
    assert.equal(result.data.limit, 20);
    assert.equal(result.data.sort, "newest");
    assert.equal(result.data.mine, false);
  }
});

test("2. Valid page and limit are accepted", () => {
  const result = reportQuerySchema.safeParse({ page: "3", limit: "15" });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.page, 3);
    assert.equal(result.data.limit, 15);
  }
});

test("3. Negative and zero page numbers are rejected", () => {
  const zero = reportQuerySchema.safeParse({ page: "0" });
  assert.equal(zero.success, false);

  const negative = reportQuerySchema.safeParse({ page: "-1" });
  assert.equal(negative.success, false);
});

test("4. Non-integer page and limit are rejected", () => {
  const floatPage = reportQuerySchema.safeParse({ page: "1.5" });
  assert.equal(floatPage.success, false);

  const floatLimit = reportQuerySchema.safeParse({ limit: "10.2" });
  assert.equal(floatLimit.success, false);
});

test("5. Excessive limit (> 50) is rejected", () => {
  const result = reportQuerySchema.safeParse({ limit: "51" });
  assert.equal(result.success, false);

  const maxValid = reportQuerySchema.safeParse({ limit: "50" });
  assert.equal(maxValid.success, true);
});

test("6. All canonical categories are accepted in query", () => {
  for (const cat of REPORT_CATEGORIES) {
    const result = reportQuerySchema.safeParse({ category: cat });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.category, cat);
    }
  }
});

test("7. Invalid category in query is rejected", () => {
  const result = reportQuerySchema.safeParse({ category: "space_debris" });
  assert.equal(result.success, false);
});

test("8. All canonical statuses are accepted in query", () => {
  for (const status of REPORT_STATUSES) {
    const result = reportQuerySchema.safeParse({ status });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.status, status);
    }
  }
});

test("9. Invalid status in query is rejected", () => {
  const result = reportQuerySchema.safeParse({ status: "abandoned" });
  assert.equal(result.success, false);
});

test("10. All canonical severities are accepted in query", () => {
  for (const severity of REPORT_SEVERITIES) {
    const result = reportQuerySchema.safeParse({ severity });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.severity, severity);
    }
  }
});

test("11. Invalid severity in query is rejected", () => {
  const result = reportQuerySchema.safeParse({ severity: "mild" });
  assert.equal(result.success, false);
});

test("12. All canonical sort options are accepted", () => {
  for (const sort of REPORT_SORT_OPTIONS) {
    const result = reportQuerySchema.safeParse({ sort });
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.sort, sort);
    }
  }
});

test("13. Invalid sort option is rejected", () => {
  const result = reportQuerySchema.safeParse({ sort: "random" });
  assert.equal(result.success, false);
});

test("14. Search query length > 100 characters is rejected", () => {
  const result = reportQuerySchema.safeParse({ search: "A".repeat(101) });
  assert.equal(result.success, false);
});

test("15. Search query is trimmed and empty string normalizes to undefined", () => {
  const valid = reportQuerySchema.safeParse({ search: "  road pothole  " });
  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.search, "road pothole");
  }

  const empty = reportQuerySchema.safeParse({ search: "   " });
  assert.equal(empty.success, true);
  if (empty.success) {
    assert.equal(empty.data.search, undefined);
  }
});

test("16. mine parameter correctly coerces truthy values", () => {
  assert.equal(reportQuerySchema.parse({ mine: "true" }).mine, true);
  assert.equal(reportQuerySchema.parse({ mine: "1" }).mine, true);
  assert.equal(reportQuerySchema.parse({ mine: "false" }).mine, false);
  assert.equal(reportQuerySchema.parse({ mine: "0" }).mine, false);
  assert.equal(reportQuerySchema.parse({}).mine, false);
});

test("17. Scope parameter allows admin and rejects invalid values", () => {
  assert.equal(reportQuerySchema.parse({ scope: "admin" }).scope, "admin");
  assert.equal(reportQuerySchema.safeParse({ scope: "superadmin" }).success, false);
});

test("18. Report ID param schema validates UUID format", () => {
  assert.equal(reportIdParamSchema.safeParse({ id: VALID_REPORT_ID }).success, true);
  assert.equal(reportIdParamSchema.safeParse({ id: "not-a-uuid" }).success, false);
  assert.equal(reportIdParamSchema.safeParse({ id: "12345" }).success, false);
});

// --- Service-Level Report Listing & Scoping Tests ---

test("19. listReports personal mode (mine=true) throws 401 when unauthenticated", async () => {
  await assert.rejects(
    async () => {
      await listReports({ mine: true }, null);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "UNAUTHORIZED");
      assert.equal(err.status, 401);
      return true;
    }
  );
});

test("20. listReports admin mode (scope=admin) throws 403 when caller is a citizen", async () => {
  await assert.rejects(
    async () => {
      await listReports({ scope: "admin" }, CITIZEN_A);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      assert.equal(err.status, 403);
      return true;
    }
  );
});

test("21. listReports personal mode scopes query to caller.id", async () => {
  let capturedUserId = "";
  let capturedRange: [number, number] = [0, 0];

  const stubClient = {
    from: (table: string) => {
      assert.equal(table, "reports");
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (col: string, val: string) => {
          if (col === "user_id") capturedUserId = val;
          return builder;
        },
        order: () => builder,
        range: (from: number, to: number) => {
          capturedRange = [from, to];
          return Promise.resolve({
            data: [
              {
                id: VALID_REPORT_ID,
                reference: "CP-" + VALID_REPORT_ID,
                title: "My Streetlight issue",
                description: "Light fixture broken.",
                category: "streetlight",
                severity: "medium",
                status: "pending",
                priority_score: 0,
                latitude: 22.5726,
                longitude: 88.3639,
                publication: "private",
                visibility: "listed",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                departments: { name: "Electrical" },
                report_images: [
                  {
                    id: "img-1",
                    storage_path: `drafts/${CITIZEN_A.id}/sample.jpg`,
                    type: "before",
                    created_at: new Date().toISOString(),
                  },
                ],
              },
            ],
            error: null,
            count: 1,
          });
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const response = await listReports({ mine: true, page: 1, limit: 10 }, CITIZEN_A, stubClient);

  assert.equal(capturedUserId, CITIZEN_A.id);
  assert.deepEqual(capturedRange, [0, 9]);
  assert.equal(response.items.length, 1);
  assert.equal(response.pagination.total, 1);
  assert.equal(response.pagination.page, 1);
  assert.equal(response.pagination.limit, 10);

  const item = response.items[0] as unknown as { publication: string; department_name: string };
  assert.equal(item.publication, "private");
  assert.equal(item.department_name, "Electrical");
});

test("22. listReports public feed enforces publication=public and visibility=listed", async () => {
  const capturedFilters: Record<string, string> = {};

  const stubClient = {
    from: (table: string) => {
      assert.equal(table, "reports");
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (col: string, val: string) => {
          capturedFilters[col] = val;
          return builder;
        },
        order: () => builder,
        range: () =>
          Promise.resolve({
            data: [
              {
                id: VALID_REPORT_ID,
                reference: "CP-" + VALID_REPORT_ID,
                title: "Public pothole",
                description: "Deep crater in road.",
                category: "pothole",
                severity: "high",
                status: "pending",
                priority_score: 0,
                latitude: 22.5726,
                longitude: 88.3639,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                departments: null,
                report_images: [],
              },
            ],
            error: null,
            count: 1,
          }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const response = await listReports({ page: 1, limit: 20 }, null, stubClient);

  assert.equal(capturedFilters["publication"], "public");
  assert.equal(capturedFilters["visibility"], "listed");
  assert.equal(response.items.length, 1);

  // Assert public projection hides private fields
  const publicItem = response.items[0] as Record<string, unknown>;
  assert.equal(publicItem.user_id, undefined);
  assert.equal(publicItem.publication, undefined);
  assert.equal(publicItem.visibility, undefined);
  assert.equal(publicItem.title, "Public pothole");
});

test("23. listReports pagination handles empty results correctly", async () => {
  const stubClient = {
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        range: () =>
          Promise.resolve({
            data: [],
            error: null,
            count: 0,
          }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const response = await listReports({ page: 1, limit: 20 }, null, stubClient);

  assert.equal(response.items.length, 0);
  assert.equal(response.pagination.total, 0);
  assert.equal(response.pagination.total_pages, 1);
  assert.equal(response.pagination.has_next_page, false);
  assert.equal(response.pagination.has_previous_page, false);
});

test("24. listReports calculates has_next_page and has_previous_page across pages", async () => {
  const stubClient = {
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        range: () =>
          Promise.resolve({
            data: [{ id: "r1", title: "R1", category: "pothole", severity: "low", status: "pending", latitude: 0, longitude: 0, created_at: "", updated_at: "" }],
            error: null,
            count: 45, // 45 items with limit 20 = 3 pages
          }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const page2Response = await listReports({ page: 2, limit: 20 }, null, stubClient);
  assert.equal(page2Response.pagination.page, 2);
  assert.equal(page2Response.pagination.total, 45);
  assert.equal(page2Response.pagination.total_pages, 3);
  assert.equal(page2Response.pagination.has_next_page, true);
  assert.equal(page2Response.pagination.has_previous_page, true);
});

// --- Service-Level Report Detail Tests ---

test("25. getReportById allows owner to view private report", async () => {
  const stubClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: {
                id: VALID_REPORT_ID,
                reference: "CP-" + VALID_REPORT_ID,
                user_id: CITIZEN_A.id,
                title: "My Private Report",
                description: "Detailed private complaint.",
                category: "pothole",
                severity: "medium",
                status: "pending",
                priority_score: 0,
                latitude: 22.5726,
                longitude: 88.3639,
                publication: "private",
                visibility: "listed",
                resolved_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                departments: { id: "dept-1", name: "Road Maintenance", description: "Roads" },
                report_images: [{ id: "img-1", storage_path: "drafts/a/b.jpg", type: "before", created_at: "" }],
              },
              error: null,
            }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  const detail = await getReportById(VALID_REPORT_ID, CITIZEN_A, stubClient);

  assert.equal(detail.id, VALID_REPORT_ID);
  assert.equal(detail.is_owner, true);
  assert.equal(detail.publication, "private");
  assert.equal(detail.department?.name, "Road Maintenance");
  assert.equal(detail.images.length, 1);
});

test("26. getReportById conceals private report from non-owner citizen with 404 NOT_FOUND", async () => {
  const stubClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: {
                id: VALID_REPORT_ID,
                user_id: CITIZEN_A.id, // Belongs to Citizen A
                title: "Citizen A Private Report",
                publication: "private",
                visibility: "listed",
              },
              error: null,
            }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  // Citizen B requests Citizen A's private report
  await assert.rejects(
    async () => {
      await getReportById(VALID_REPORT_ID, CITIZEN_B, stubClient);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "NOT_FOUND");
      assert.equal(err.status, 404);
      return true;
    }
  );
});

test("27. getReportById allows anonymous visitor to view public listed report", async () => {
  const stubClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: {
                id: VALID_REPORT_ID,
                reference: "CP-" + VALID_REPORT_ID,
                user_id: CITIZEN_A.id,
                title: "Public Clean Park Report",
                description: "Garbage pile in park.",
                category: "garbage",
                severity: "low",
                status: "pending",
                priority_score: 0,
                latitude: 22.5726,
                longitude: 88.3639,
                publication: "public",
                visibility: "listed",
                resolved_at: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                departments: { id: "dept-2", name: "Sanitation" },
                report_images: [],
              },
              error: null,
            }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  const detail = await getReportById(VALID_REPORT_ID, null, stubClient);

  assert.equal(detail.id, VALID_REPORT_ID);
  assert.equal(detail.is_owner, false);
  assert.equal(detail.publication, undefined); // Omitted in public projection
  assert.equal(detail.department?.name, "Sanitation");
});

test("28. getReportById allows admin to view any report", async () => {
  const stubClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () =>
            Promise.resolve({
              data: {
                id: VALID_REPORT_ID,
                reference: "CP-" + VALID_REPORT_ID,
                user_id: CITIZEN_A.id,
                title: "Citizen A Private Report",
                description: "Admin inspects this private report.",
                category: "pothole",
                severity: "medium",
                status: "pending",
                priority_score: 0,
                latitude: 22.5726,
                longitude: 88.3639,
                publication: "private",
                visibility: "listed",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                departments: null,
                report_images: [],
              },
              error: null,
            }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  const detail = await getReportById(VALID_REPORT_ID, ADMIN_USER, stubClient);

  assert.equal(detail.id, VALID_REPORT_ID);
  assert.equal(detail.is_owner, false);
  assert.equal(detail.publication, "private");
});

test("29. getReportById throws 404 NOT_FOUND for nonexistent complaint ID", async () => {
  const stubClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await getReportById("00000000-0000-0000-0000-000000000000", null, stubClient);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "NOT_FOUND");
      assert.equal(err.status, 404);
      return true;
    }
  );
});
