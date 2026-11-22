import test from "node:test";
import assert from "node:assert/strict";

import {
  MAP_CONFIG,
  calculateLatitudeSpan,
  calculateLongitudeSpan,
  crossesAntimeridian,
} from "../src/config/map.ts";
import { getMapMarkers } from "../src/services/map.service.ts";
import { mapQuerySchema } from "../src/validators/map-query.schema.ts";
import { AppError } from "../src/utils/app-error.ts";
import { successResponse, errorResponse } from "../src/utils/api-response.ts";
import type { AuthenticatedUser } from "../src/types/auth.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

// Mock Department Directory
const DEPT_ROAD = { id: "11111111-0000-4000-8000-000000000001", name: "Road Maintenance" };
const DEPT_SAN = { id: "11111111-0000-4000-8000-000000000002", name: "Sanitation" };

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

// --- Group 1: Geographic Calculation Utilities ---

test("GeoCalc 00: MAP_CONFIG exposes authoritative default and limit constants", () => {
  assert.equal(MAP_CONFIG.DEFAULT_LIMIT, 200);
  assert.equal(MAP_CONFIG.MAX_LIMIT, 300);
  assert.equal(MAP_CONFIG.MIN_LIMIT, 1);
  assert.equal(MAP_CONFIG.MAX_LATITUDE_SPAN, 50.0);
  assert.equal(MAP_CONFIG.MAX_LONGITUDE_SPAN, 60.0);
  assert.deepEqual(MAP_CONFIG.DEFAULT_STATUSES, ["pending", "in_progress"]);
});

test("GeoCalc 01: crossesAntimeridian correctly identifies dateline wraparound", () => {
  assert.equal(crossesAntimeridian(170, -170), true);
  assert.equal(crossesAntimeridian(179.5, -179.5), true);
  assert.equal(crossesAntimeridian(88.3, 88.5), false);
  assert.equal(crossesAntimeridian(-122.5, -122.3), false);
});

test("GeoCalc 02: calculateLatitudeSpan computes north - south accurately", () => {
  assert.ok(Math.abs(calculateLatitudeSpan(22.5, 22.7) - 0.2) < 1e-9);
  assert.equal(calculateLatitudeSpan(-10, 10), 20);
  assert.equal(calculateLatitudeSpan(-90, -80), 10);
});

test("GeoCalc 03: calculateLongitudeSpan handles normal and antimeridian crossing", () => {
  // Normal
  assert.ok(Math.abs(calculateLongitudeSpan(88.3, 88.5) - 0.2) < 1e-9);
  assert.equal(calculateLongitudeSpan(-10, 20), 30);
  // Antimeridian crossing: 170 to -170 is (180 - 170) + (-170 - (-180)) = 10 + 10 = 20
  assert.equal(calculateLongitudeSpan(170, -170), 20);
  // Antimeridian crossing: 179.5 to -179.5 is 1 degree
  assert.equal(calculateLongitudeSpan(179.5, -179.5), 1);
});

// --- Group 2: Viewport & Coordinate Validation Tests ---

test("Validation 01: Valid bounding box passes schema validation", () => {
  const result = mapQuerySchema.safeParse({
    south: "22.50",
    west: "88.30",
    north: "22.70",
    east: "88.50",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.south, 22.5);
    assert.equal(result.data.west, 88.3);
    assert.equal(result.data.north, 22.7);
    assert.equal(result.data.east, 88.5);
    assert.equal(result.data.limit, 200); // default limit
    assert.equal(result.data.sort, "newest"); // default sort
  }
});

test("Validation 02: Negative coordinates (southern and western hemispheres) pass", () => {
  const result = mapQuerySchema.safeParse({
    south: "-34.00",
    west: "-58.50",
    north: "-33.80",
    east: "-58.30",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.south, -34.0);
    assert.equal(result.data.west, -58.5);
  }
});

test("Validation 03: Equator and Prime Meridian (0,0) pass validation", () => {
  const result = mapQuerySchema.safeParse({
    south: "-0.5",
    west: "-0.5",
    north: "0.5",
    east: "0.5",
  });
  assert.equal(result.success, true);
});

test("Validation 04: Extreme polar latitudes (-90 and 90) pass validation", () => {
  const result = mapQuerySchema.safeParse({
    south: "-90",
    west: "0",
    north: "-85",
    east: "10",
  });
  assert.equal(result.success, true);
});

test("Validation 05: Inverted latitude (south >= north) is rejected", () => {
  const inverted = mapQuerySchema.safeParse({
    south: "22.70",
    west: "88.30",
    north: "22.50",
    east: "88.50",
  });
  assert.equal(inverted.success, false);
});

test("Validation 06: Degenerate zero-height viewport (south === north) is rejected", () => {
  const zeroHeight = mapQuerySchema.safeParse({
    south: "22.50",
    west: "88.30",
    north: "22.50",
    east: "88.50",
  });
  assert.equal(zeroHeight.success, false);
});

test("Validation 07: Degenerate zero-width viewport (west === east) is rejected", () => {
  const zeroWidth = mapQuerySchema.safeParse({
    south: "22.50",
    west: "88.30",
    north: "22.70",
    east: "88.30",
  });
  assert.equal(zeroWidth.success, false);
});

test("Validation 08: Non-numeric strings, NaN, Infinity, and empty strings are rejected", () => {
  assert.equal(
    mapQuerySchema.safeParse({ south: "abc", west: "88", north: "23", east: "89" }).success,
    false
  );
  assert.equal(
    mapQuerySchema.safeParse({ south: "NaN", west: "88", north: "23", east: "89" }).success,
    false
  );
  assert.equal(
    mapQuerySchema.safeParse({ south: "Infinity", west: "88", north: "23", east: "89" }).success,
    false
  );
  assert.equal(
    mapQuerySchema.safeParse({ south: "", west: "88", north: "23", east: "89" }).success,
    false
  );
});

test("Validation 09: Out-of-range coordinates are rejected", () => {
  assert.equal(
    mapQuerySchema.safeParse({ south: "-95", west: "88", north: "23", east: "89" }).success,
    false
  );
  assert.equal(
    mapQuerySchema.safeParse({ south: "22", west: "-185", north: "23", east: "89" }).success,
    false
  );
  assert.equal(
    mapQuerySchema.safeParse({ south: "22", west: "88", north: "95", east: "89" }).success,
    false
  );
  assert.equal(
    mapQuerySchema.safeParse({ south: "22", west: "88", north: "23", east: "185" }).success,
    false
  );
});

test("Validation 10: Oversized viewport latitude span (> 50 deg) is rejected", () => {
  const result = mapQuerySchema.safeParse({
    south: "-30",
    west: "0",
    north: "30", // span = 60 > 50
    east: "10",
  });
  assert.equal(result.success, false);
});

test("Validation 11: Oversized viewport longitude span (> 60 deg) is rejected", () => {
  const result = mapQuerySchema.safeParse({
    south: "10",
    west: "0",
    north: "20",
    east: "70", // span = 70 > 60
  });
  assert.equal(result.success, false);
});

test("Validation 12: Valid antimeridian crossing (west=170, east=-170, span=20 deg) passes", () => {
  const result = mapQuerySchema.safeParse({
    south: "-10",
    west: "170",
    north: "10",
    east: "-170",
  });
  assert.equal(result.success, true);
});

// --- Group 3: Database Spatial Query & Boundary Inclusions ---

test("Spatial 01: Normal bounding box query applies correct gte/lte predicates", async () => {
  const mockRows = [
    {
      id: "report-1",
      latitude: 22.57,
      longitude: 88.36,
      title: "Pothole on Park Street",
      category: "pothole",
      status: "pending",
      severity: "high",
      priority_score: 68,
      created_at: "2026-11-21T10:00:00Z",
      departments: DEPT_ROAD,
    },
  ];

  let appliedGteLat: number | null = null;
  let appliedLteLat: number | null = null;
  let appliedGteLon: number | null = null;
  let appliedLteLon: number | null = null;
  let appliedPublic = false;
  let appliedListed = false;

  const stubClient = {
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (col: string, val: string) => {
          if (col === "publication" && val === "public") appliedPublic = true;
          if (col === "visibility" && val === "listed") appliedListed = true;
          return builder;
        },
        gte: (col: string, val: number) => {
          if (col === "latitude") appliedGteLat = val;
          if (col === "longitude") appliedGteLon = val;
          return builder;
        },
        lte: (col: string, val: number) => {
          if (col === "latitude") appliedLteLat = val;
          if (col === "longitude") appliedLteLon = val;
          return builder;
        },
        in: () => builder,
        order: () => builder,
        limit: () => ({
          then: (resolve: (val: { data: unknown; error: null }) => void) =>
            resolve({ data: mockRows, error: null }),
        }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const result = await getMapMarkers(
    {
      south: 22.5,
      west: 88.3,
      north: 22.7,
      east: 88.5,
    },
    null,
    stubClient
  );

  assert.equal(result.markers.length, 1);
  assert.equal(result.returned_count, 1);
  assert.equal(result.has_more, false);
  assert.equal(result.viewport.crosses_antimeridian, false);
  assert.equal(appliedGteLat, 22.5);
  assert.equal(appliedLteLat, 22.7);
  assert.equal(appliedGteLon, 88.3);
  assert.equal(appliedLteLon, 88.5);
  assert.equal(appliedPublic, true);
  assert.equal(appliedListed, true);
});

test("Spatial 02: Antimeridian-crossing query applies OR filter for longitude wrapping", async () => {
  let appliedOrFilter = "";

  const stubClient = {
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        gte: () => builder,
        lte: () => builder,
        or: (filterStr: string) => {
          appliedOrFilter = filterStr;
          return builder;
        },
        in: () => builder,
        order: () => builder,
        limit: () => ({
          then: (resolve: (val: { data: unknown; error: null }) => void) =>
            resolve({ data: [], error: null }),
        }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const result = await getMapMarkers(
    {
      south: -10,
      west: 175,
      north: 10,
      east: -175,
    },
    null,
    stubClient
  );

  assert.equal(result.viewport.crosses_antimeridian, true);
  assert.equal(appliedOrFilter, "longitude.gte.175,longitude.lte.-175");
});

// --- Group 4: Filtering & Defaults Tests ---

test("Filter 01: Status defaults to active unresolved complaints (pending, in_progress)", async () => {
  let queriedStatuses: string[] = [];

  const stubClient = {
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        gte: () => builder,
        lte: () => builder,
        in: (col: string, values: string[]) => {
          if (col === "status") queriedStatuses = values;
          return builder;
        },
        order: () => builder,
        limit: () => ({
          then: (resolve: (val: { data: unknown; error: null }) => void) =>
            resolve({ data: [], error: null }),
        }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  await getMapMarkers({ south: 22.5, west: 88.3, north: 22.7, east: 88.5 }, null, stubClient);
  assert.deepEqual(queriedStatuses, ["pending", "in_progress"]);
});

test("Filter 02: Status filter 'all' queries pending, in_progress, and resolved", async () => {
  let queriedStatuses: string[] = [];

  const stubClient = {
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        gte: () => builder,
        lte: () => builder,
        in: (col: string, values: string[]) => {
          if (col === "status") queriedStatuses = values;
          return builder;
        },
        order: () => builder,
        limit: () => ({
          then: (resolve: (val: { data: unknown; error: null }) => void) =>
            resolve({ data: [], error: null }),
        }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  await getMapMarkers(
    { south: 22.5, west: 88.3, north: 22.7, east: 88.5, status: "all" },
    null,
    stubClient
  );
  assert.deepEqual(queriedStatuses, ["pending", "in_progress", "resolved"]);
});

test("Filter 03: Category, severity, and department_id filters are applied", async () => {
  const appliedFilters: Record<string, unknown> = {};

  const stubClient = {
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          appliedFilters[col] = val;
          return builder;
        },
        gte: () => builder,
        lte: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => ({
          then: (resolve: (val: { data: unknown; error: null }) => void) =>
            resolve({ data: [], error: null }),
        }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  await getMapMarkers(
    {
      south: 22.5,
      west: 88.3,
      north: 22.7,
      east: 88.5,
      category: "garbage",
      severity: "critical",
      department_id: DEPT_SAN.id,
      status: "pending",
    },
    null,
    stubClient
  );

  assert.equal(appliedFilters.category, "garbage");
  assert.equal(appliedFilters.severity, "critical");
  assert.equal(appliedFilters.department_id, DEPT_SAN.id);
  assert.equal(appliedFilters.status, "pending");
});

// --- Group 5: Result Limits & Overflow Tests ---

test("Limit 01: has_more correctly detects when matching rows exceed requested limit", async () => {
  // Simulate database returning limit + 1 rows
  const requestedLimit = 2;
  const mockRows = [
    { id: "1", latitude: 22.51, longitude: 88.31, title: "A", category: "pothole", status: "pending", severity: "low", priority_score: 15, created_at: "2026-11-21T00:00:00Z" },
    { id: "2", latitude: 22.52, longitude: 88.32, title: "B", category: "pothole", status: "pending", severity: "low", priority_score: 15, created_at: "2026-11-21T00:00:00Z" },
    { id: "3", latitude: 22.53, longitude: 88.33, title: "C", category: "pothole", status: "pending", severity: "low", priority_score: 15, created_at: "2026-11-21T00:00:00Z" },
  ];

  const stubClient = {
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        gte: () => builder,
        lte: () => builder,
        in: () => builder,
        order: () => builder,
        limit: (n: number) => {
          assert.equal(n, requestedLimit + 1);
          return {
            then: (resolve: (val: { data: unknown; error: null }) => void) =>
              resolve({ data: mockRows, error: null }),
          };
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const result = await getMapMarkers(
    { south: 22.5, west: 88.3, north: 22.7, east: 88.5, limit: requestedLimit },
    null,
    stubClient
  );

  assert.equal(result.markers.length, requestedLimit); // Sliced to limit
  assert.equal(result.returned_count, requestedLimit);
  assert.equal(result.has_more, true);
});

test("Limit 02: Empty viewport returns HTTP 200 payload with empty markers and has_more=false", async () => {
  const stubClient = {
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        gte: () => builder,
        lte: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => ({
          then: (resolve: (val: { data: unknown; error: null }) => void) =>
            resolve({ data: [], error: null }),
        }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const result = await getMapMarkers(
    { south: 22.5, west: 88.3, north: 22.7, east: 88.5 },
    null,
    stubClient
  );

  assert.equal(result.markers.length, 0);
  assert.equal(result.returned_count, 0);
  assert.equal(result.has_more, false);
});

// --- Group 6: Security, Privacy & Minimal Projection Tests ---

test("Security 01: Public markers strictly project map-safe fields and omit PII", async () => {
  const mockRow = {
    id: "report-uuid-1234",
    latitude: 22.57,
    longitude: 88.36,
    title: "Broken streetlight fixture",
    category: "streetlight",
    status: "pending",
    severity: "medium",
    priority_score: 30,
    created_at: "2026-11-21T12:00:00Z",
    departments: { id: "dept-1", name: "Electrical" },
    // Sensitive fields that must NOT leak into markers
    user_id: "private-user-id",
    description: "Detailed description with personal address",
    email: "citizen@example.com",
    storage_path: "drafts/citizen/evidence.jpg",
  };

  const stubClient = {
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        gte: () => builder,
        lte: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => ({
          then: (resolve: (val: { data: unknown; error: null }) => void) =>
            resolve({ data: [mockRow], error: null }),
        }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  const result = await getMapMarkers(
    { south: 22.5, west: 88.3, north: 22.7, east: 88.5 },
    null,
    stubClient
  );

  const marker = result.markers[0];
  assert.ok(marker);
  assert.equal(marker.id, mockRow.id);
  assert.equal(marker.title, mockRow.title);
  assert.equal(marker.latitude, mockRow.latitude);
  assert.equal(marker.longitude, mockRow.longitude);
  assert.equal(marker.category, "streetlight");
  assert.equal(marker.priority_score, 30);
  assert.equal(marker.department?.name, "Electrical");

  // Verify that sensitive fields are completely omitted
  const markerKeys = Object.keys(marker);
  assert.equal(markerKeys.includes("user_id"), false);
  assert.equal(markerKeys.includes("email"), false);
  assert.equal(markerKeys.includes("description"), false);
  assert.equal(markerKeys.includes("storage_path"), false);
});

test("Security 02: Admin role bypasses publication restriction for operational triage", async () => {
  let appliedPublicationCheck = false;

  const stubClient = {
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (col: string) => {
          if (col === "publication") appliedPublicationCheck = true;
          return builder;
        },
        gte: () => builder,
        lte: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => ({
          then: (resolve: (val: { data: unknown; error: null }) => void) =>
            resolve({ data: [], error: null }),
        }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  await getMapMarkers(
    { south: 22.5, west: 88.3, north: 22.7, east: 88.5 },
    ADMIN_USER,
    stubClient
  );

  assert.equal(appliedPublicationCheck, false, "Admin view should not be constrained by publication='public'");
});

test("Security 03: Citizen user remains constrained by public listed visibility", async () => {
  let appliedPublicationCheck = false;

  const stubClient = {
    from: () => {
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
          if (col === "publication" && val === "public") appliedPublicationCheck = true;
          return builder;
        },
        gte: () => builder,
        lte: () => builder,
        in: () => builder,
        order: () => builder,
        limit: () => ({
          then: (resolve: (val: { data: unknown; error: null }) => void) =>
            resolve({ data: [], error: null }),
        }),
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  await getMapMarkers(
    { south: 22.5, west: 88.3, north: 22.7, east: 88.5 },
    CITIZEN_USER,
    stubClient
  );

  assert.equal(appliedPublicationCheck, true);
});

test("Security 04: Schema strictly rejects unknown/forbidden query fields", () => {
  const result = mapQuerySchema.safeParse({
    south: "22.5",
    west: "88.3",
    north: "22.7",
    east: "88.5",
    role: "admin", // Injected authority parameter
  });
  assert.equal(result.success, false);
});

// --- Group 7: Route Contract & Caching Tests ---

test("RouteContract 01: API success response sets Cache-Control: no-store", () => {
  const payload = {
    markers: [],
    viewport: { south: 22.5, west: 88.3, north: 22.7, east: 88.5, crosses_antimeridian: false },
    returned_count: 0,
    limit: 200,
    has_more: false,
  };

  const response = successResponse(payload, { status: 200, message: "No reports found in this map area" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("RouteContract 02: API error response maps AppError and sets Cache-Control: no-store", () => {
  const err = new AppError("VALIDATION_ERROR", "Invalid map query parameters");
  const response = errorResponse(err);
  assert.equal(response.status, 422);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
