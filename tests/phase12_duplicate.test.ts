import test from "node:test";
import assert from "node:assert/strict";

import {
  EARTH_RADIUS_METERS,
  DUPLICATE_RADIUS_METERS,
  haversineDistanceMeters,
  getBoundingBox,
  isWithinRadius,
  normalizeLongitudeDifference,
  toRadians,
  toDegrees,
} from "../src/utils/haversine.ts";
import { DUPLICATE_CONFIG } from "../src/config/duplicate.ts";
import { checkDuplicatesSchema } from "../src/validators/duplicate.schema.ts";
import { checkDuplicateReports } from "../src/services/duplicate.service.ts";
import { errorResponse, successResponse } from "../src/utils/api-response.ts";
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

const ADMIN_USER: AuthenticatedUser = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "admin@civicpulse.org",
  full_name: "Admin Officer",
  role: "admin",
};

// Center reference coordinates (Kolkata, India)
const BASE_LAT = 22.5726;
const BASE_LON = 88.3639;

// Delta for 1 meter at Kolkata latitude (~8.9932e-6 degrees lat)
const ONE_METER_LAT_DEG = (1 / EARTH_RADIUS_METERS) * (180 / Math.PI);

// Helper to create mock Supabase client returning given reports rows
function createMockSupabaseClient(rows: Record<string, unknown>[], shouldFail = false) {
  return {
    from: (table: string) => {
      assert.equal(table, "reports");
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        gte: () => builder,
        lte: () => builder,
        or: () => builder,
        then: (resolve: (val: unknown) => void) => {
          if (shouldFail) {
            resolve({ data: null, error: { message: "Database connection failed", code: "PGRST000" } });
          } else {
            resolve({ data: rows, error: null });
          }
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;
}

// =========================================================================
// SECTION 1: Automated Haversine Mathematical Unit Tests (20 tests)
// =========================================================================

test("Haversine 01: Identical coordinates return exactly zero distance", () => {
  const distance = haversineDistanceMeters(BASE_LAT, BASE_LON, BASE_LAT, BASE_LON);
  assert.equal(distance, 0);
});

test("Haversine 02: Small north-south separation calculates accurately", () => {
  const targetLat = BASE_LAT + 50 * ONE_METER_LAT_DEG; // 50 meters North
  const distance = haversineDistanceMeters(BASE_LAT, BASE_LON, targetLat, BASE_LON);
  assert.ok(Math.abs(distance - 50) < 0.05, `Expected ~50m, got ${distance}`);
});

test("Haversine 03: Small east-west separation calculates accurately", () => {
  const latRad = toRadians(BASE_LAT);
  const oneMeterLonDeg = (1 / (EARTH_RADIUS_METERS * Math.cos(latRad))) * (180 / Math.PI);
  const targetLon = BASE_LON + 40 * oneMeterLonDeg; // 40 meters East
  const distance = haversineDistanceMeters(BASE_LAT, BASE_LON, BASE_LAT, targetLon);
  assert.ok(Math.abs(distance - 40) < 0.05, `Expected ~40m, got ${distance}`);
});

test("Haversine 04: Known reference coordinates (London to Paris ~343.5km)", () => {
  const londonLat = 51.5074;
  const londonLon = -0.1278;
  const parisLat = 48.8566;
  const parisLon = 2.3522;
  const distance = haversineDistanceMeters(londonLat, londonLon, parisLat, parisLon);
  assert.ok(
    Math.abs(distance - 343556) < 2000,
    `Expected London-Paris distance ~343.5km, got ${distance / 1000}km`
  );
});

test("Haversine 05: Negative latitude (Southern hemisphere coordinates)", () => {
  const sydneyLat = -33.8688;
  const sydneyLon = 151.2093;
  const melbourneLat = -37.8136;
  const melbourneLon = 144.9631;
  const distance = haversineDistanceMeters(sydneyLat, sydneyLon, melbourneLat, melbourneLon);
  assert.ok(
    Math.abs(distance - 713600) < 5000,
    `Expected Sydney-Melbourne distance ~713km, got ${distance / 1000}km`
  );
});

test("Haversine 06: Negative longitude (Western hemisphere coordinates)", () => {
  const nyLat = 40.7128;
  const nyLon = -74.006;
  const bostonLat = 42.3601;
  const bostonLon = -71.0589;
  const distance = haversineDistanceMeters(nyLat, nyLon, bostonLat, bostonLon);
  assert.ok(
    Math.abs(distance - 305800) < 5000,
    `Expected NY-Boston distance ~306km, got ${distance / 1000}km`
  );
});

test("Haversine 07: Coordinates near the Equator calculate correctly", () => {
  const d = haversineDistanceMeters(0, 0, 0, 0.00089932);
  assert.ok(Math.abs(d - 100) < 0.1, `Expected ~100m, got ${d}`);
});

test("Haversine 08: Coordinates near the North Pole calculate safely", () => {
  const poleDistance = haversineDistanceMeters(89.99, 0, 89.99, 180);
  assert.ok(Number.isFinite(poleDistance));
  assert.ok(poleDistance > 0);
  assert.ok(!Number.isNaN(poleDistance));
});

test("Haversine 09: Coordinates near the South Pole calculate safely", () => {
  const poleDistance = haversineDistanceMeters(-89.99, 0, -89.99, 90);
  assert.ok(Number.isFinite(poleDistance));
  assert.ok(poleDistance > 0);
  assert.ok(!Number.isNaN(poleDistance));
});

test("Haversine 10: Coordinates across the International Date Line wrap around properly", () => {
  // +179.9999 to -179.9999 is 0.0002 degrees across the antimeridian (~22.24 meters at equator)
  const d = haversineDistanceMeters(0, 179.9999, 0, -179.9999);
  assert.ok(d < 50, `Expected ~22m across Date Line, got ${d}`);
  assert.ok(Math.abs(d - 22.24) < 0.5, `Expected ~22.24m, got ${d}`);
});

test("Haversine 11: Antipodal points (opposite ends of Earth) do not produce NaN", () => {
  const antipodal = haversineDistanceMeters(0, 0, 0, 180);
  const expectedHalfCircumference = Math.PI * EARTH_RADIUS_METERS; // ~20,015,087m
  assert.ok(Number.isFinite(antipodal));
  assert.ok(!Number.isNaN(antipodal));
  assert.ok(Math.abs(antipodal - expectedHalfCircumference) < 100);
});

test("Haversine 12: Zero latitude (Equator) is valid and accurate", () => {
  const d = haversineDistanceMeters(0, 10, 0, 10);
  assert.equal(d, 0);
});

test("Haversine 13: Zero longitude (Prime Meridian) is valid and accurate", () => {
  const d = haversineDistanceMeters(51.4769, 0, 51.4769, 0);
  assert.equal(d, 0);
});

test("Haversine 14: Very small non-zero separation (1 meter) is resolved accurately", () => {
  const targetLat = BASE_LAT + ONE_METER_LAT_DEG; // 1 meter North
  const d = haversineDistanceMeters(BASE_LAT, BASE_LON, targetLat, BASE_LON);
  assert.ok(Math.abs(d - 1.0) < 0.01, `Expected ~1.0m, got ${d}`);
});

test("Haversine 15: Large separation (quarter of globe) is accurate", () => {
  const d = haversineDistanceMeters(0, 0, 90, 0);
  const expectedQuarter = (Math.PI / 2) * EARTH_RADIUS_METERS;
  assert.ok(Math.abs(d - expectedQuarter) < 100);
});

test("Haversine 16: Output is always a finite number", () => {
  const d = haversineDistanceMeters(10.5, 20.3, -40.2, 110.8);
  assert.ok(Number.isFinite(d));
});

test("Haversine 17: Output is always non-negative", () => {
  const d1 = haversineDistanceMeters(BASE_LAT, BASE_LON, BASE_LAT, BASE_LON);
  const d2 = haversineDistanceMeters(-10, -20, 30, 40);
  assert.ok(d1 >= 0);
  assert.ok(d2 >= 0);
});

test("Haversine 18: Symmetry is guaranteed: Distance(A, B) === Distance(B, A)", () => {
  const p1 = { lat: 28.6139, lon: 77.209 }; // New Delhi
  const p2 = { lat: 19.076, lon: 72.8777 }; // Mumbai
  const dAB = haversineDistanceMeters(p1.lat, p1.lon, p2.lat, p2.lon);
  const dBA = haversineDistanceMeters(p2.lat, p2.lon, p1.lat, p1.lon);
  assert.ok(Math.abs(dAB - dBA) < 0.0001, `Symmetry failed: ${dAB} vs ${dBA}`);
});

test("Haversine 19: Non-finite inputs throw TypeError safely", () => {
  assert.throws(
    () => haversineDistanceMeters(NaN, BASE_LON, BASE_LAT, BASE_LON),
    TypeError
  );
  assert.throws(
    () => haversineDistanceMeters(BASE_LAT, Infinity, BASE_LAT, BASE_LON),
    TypeError
  );
});

test("Haversine 20: Consistent units (Earth radius = 6,371,000 meters)", () => {
  assert.equal(EARTH_RADIUS_METERS, 6_371_000);
  assert.equal(DUPLICATE_RADIUS_METERS, 100);
  assert.equal(DUPLICATE_CONFIG.SEARCH_RADIUS_METERS, 100);
  assert.equal(DUPLICATE_CONFIG.EARTH_RADIUS_METERS, 6_371_000);
  assert.equal(Math.round(toDegrees(Math.PI)), 180);
  assert.equal(normalizeLongitudeDifference(359), -1);
});

// =========================================================================
// SECTION 2: 100-Meter Boundary Precision Tests
// =========================================================================

test("Boundary 01: Candidate 25 meters away is included", () => {
  const targetLat = BASE_LAT + 25 * ONE_METER_LAT_DEG;
  const distance = haversineDistanceMeters(BASE_LAT, BASE_LON, targetLat, BASE_LON);
  assert.ok(Math.abs(distance - 25) < 0.1);
  assert.equal(isWithinRadius(BASE_LAT, BASE_LON, targetLat, BASE_LON, 100), true);
});

test("Boundary 02: Candidate 99 meters away is included", () => {
  const targetLat = BASE_LAT + 99 * ONE_METER_LAT_DEG;
  const distance = haversineDistanceMeters(BASE_LAT, BASE_LON, targetLat, BASE_LON);
  assert.ok(Math.abs(distance - 99) < 0.1);
  assert.equal(isWithinRadius(BASE_LAT, BASE_LON, targetLat, BASE_LON, 100), true);
});

test("Boundary 03: Candidate exactly at 100.0 meters is included", () => {
  const targetLat = BASE_LAT + 100 * ONE_METER_LAT_DEG;
  const distance = haversineDistanceMeters(BASE_LAT, BASE_LON, targetLat, BASE_LON);
  assert.ok(Math.abs(distance - 100) < 0.05);
  assert.equal(isWithinRadius(BASE_LAT, BASE_LON, targetLat, BASE_LON, 100.0), true);
});

test("Boundary 04: Candidate at 100.2 meters is excluded (unrounded threshold check)", () => {
  const targetLat = BASE_LAT + 100.2 * ONE_METER_LAT_DEG;
  const distance = haversineDistanceMeters(BASE_LAT, BASE_LON, targetLat, BASE_LON);
  assert.ok(distance > 100.0);
  assert.equal(isWithinRadius(BASE_LAT, BASE_LON, targetLat, BASE_LON, 100.0), false);
});

test("Boundary 05: Candidate 150 meters away is excluded", () => {
  const targetLat = BASE_LAT + 150 * ONE_METER_LAT_DEG;
  assert.equal(isWithinRadius(BASE_LAT, BASE_LON, targetLat, BASE_LON, 100.0), false);
});

test("Boundary 06: Bounding box prefilter contains safety margin (105m)", () => {
  const box = getBoundingBox(BASE_LAT, BASE_LON, 100, 1.05);
  // Point at 100m North must be strictly inside [minLat, maxLat]
  const targetLat = BASE_LAT + 100 * ONE_METER_LAT_DEG;
  assert.ok(targetLat > box.minLat && targetLat < box.maxLat);
});

// =========================================================================
// SECTION 3: Canonical Category Matching & Advisory Policy Tests
// =========================================================================

test("Category 01: Same category within 100m matches successfully", async () => {
  const candidateId = "aaaa0001-0000-4000-8000-000000000001";
  const mockClient = createMockSupabaseClient([
    {
      id: candidateId,
      title: "Deep pothole on Main Road",
      category: "pothole",
      status: "pending",
      latitude: BASE_LAT + 30 * ONE_METER_LAT_DEG, // 30m away
      longitude: BASE_LON,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      user_id: CITIZEN_B.id,
      publication: "public",
      visibility: "listed",
    },
  ]);

  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "pothole" },
    CITIZEN_A,
    mockClient
  );

  assert.equal(res.has_potential_duplicates, true);
  assert.equal(res.matches.length, 1);
  assert.equal(res.matches[0].id, candidateId);
  assert.equal(res.matches[0].distance_meters, 30);
  assert.equal(res.match_policy, "same_category_within_100m");
});

test("Category 02: Different category within 100m is excluded by service", async () => {
  // Query returns a garbage report while citizen searches for pothole
  const mockClient = createMockSupabaseClient([
    {
      id: "bbbb0002-0000-4000-8000-000000000002",
      title: "Overflowing garbage bin",
      category: "garbage",
      status: "pending",
      latitude: BASE_LAT + 20 * ONE_METER_LAT_DEG,
      longitude: BASE_LON,
      created_at: new Date().toISOString(),
      user_id: CITIZEN_B.id,
      publication: "public",
      visibility: "listed",
    },
  ]);

  // Note: Database query already filters on category, but even if row returned,
  // we check duplicate check with category = 'pothole'.
  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "pothole" },
    CITIZEN_A,
    mockClient
  );

  assert.equal(res.has_potential_duplicates, false);
  assert.equal(res.matches.length, 0);
});

test("Category 03: Special category 'other' uses advisory match policy", async () => {
  const candidateId = "cccc0003-0000-4000-8000-000000000003";
  const mockClient = createMockSupabaseClient([
    {
      id: candidateId,
      title: "Unclassified civic obstacle",
      category: "other",
      status: "pending",
      latitude: BASE_LAT + 45 * ONE_METER_LAT_DEG,
      longitude: BASE_LON,
      created_at: new Date().toISOString(),
      user_id: CITIZEN_B.id,
      publication: "public",
      visibility: "listed",
    },
  ]);

  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "other" },
    CITIZEN_A,
    mockClient
  );

  assert.equal(res.has_potential_duplicates, true);
  assert.equal(res.match_policy, "other_category_proximity_advisory");
  assert.equal(res.matches[0].distance_meters, 45);
});

// =========================================================================
// SECTION 4: Status Eligibility Tests
// =========================================================================

test("Status 01: 'pending' status complaints are eligible", async () => {
  const mockClient = createMockSupabaseClient([
    {
      id: "dddd0004-0000-4000-8000-000000000004",
      title: "Pending leak",
      category: "water_leakage",
      status: "pending",
      latitude: BASE_LAT + 15 * ONE_METER_LAT_DEG,
      longitude: BASE_LON,
      created_at: new Date().toISOString(),
      user_id: CITIZEN_B.id,
      publication: "public",
      visibility: "listed",
    },
  ]);

  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "water_leakage" },
    CITIZEN_A,
    mockClient
  );

  assert.equal(res.has_potential_duplicates, true);
  assert.equal(res.matches[0].status, "pending");
});

test("Status 02: 'in_progress' status complaints are eligible", async () => {
  const mockClient = createMockSupabaseClient([
    {
      id: "eeee0005-0000-4000-8000-000000000005",
      title: "In-progress drainage repair",
      category: "drainage",
      status: "in_progress",
      latitude: BASE_LAT + 25 * ONE_METER_LAT_DEG,
      longitude: BASE_LON,
      created_at: new Date().toISOString(),
      user_id: CITIZEN_B.id,
      publication: "public",
      visibility: "listed",
    },
  ]);

  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "drainage" },
    CITIZEN_A,
    mockClient
  );

  assert.equal(res.has_potential_duplicates, true);
  assert.equal(res.matches[0].status, "in_progress");
});

test("Status 03: 'resolved' status complaints are excluded by service query filter", async () => {
  // If the query were ever to return a resolved row, the service filters eligible statuses
  const mockClient = createMockSupabaseClient([
    {
      id: "ffff0006-0000-4000-8000-000000000006",
      title: "Fixed streetlight",
      category: "streetlight",
      status: "resolved", // Inactive
      latitude: BASE_LAT + 10 * ONE_METER_LAT_DEG,
      longitude: BASE_LON,
      created_at: new Date().toISOString(),
      user_id: CITIZEN_B.id,
      publication: "public",
      visibility: "listed",
    },
  ]);

  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "streetlight" },
    CITIZEN_A,
    mockClient
  );

  // Excluded because status != pending && status != in_progress
  assert.equal(res.has_potential_duplicates, false);
  assert.equal(res.matches.length, 0);
});

// =========================================================================
// SECTION 5: Ranking, Tie-Breaking & Result Limiting Tests
// =========================================================================

test("Ranking 01: Candidates are sorted nearest first (20m, 50m, 80m)", async () => {
  const mockClient = createMockSupabaseClient([
    {
      id: "rep-80m",
      title: "Pothole at 80m",
      category: "pothole",
      status: "pending",
      latitude: BASE_LAT + 80 * ONE_METER_LAT_DEG,
      longitude: BASE_LON,
      created_at: "2026-11-20T10:00:00.000Z",
      publication: "public",
      visibility: "listed",
    },
    {
      id: "rep-20m",
      title: "Pothole at 20m",
      category: "pothole",
      status: "pending",
      latitude: BASE_LAT + 20 * ONE_METER_LAT_DEG,
      longitude: BASE_LON,
      created_at: "2026-11-20T08:00:00.000Z",
      publication: "public",
      visibility: "listed",
    },
    {
      id: "rep-50m",
      title: "Pothole at 50m",
      category: "pothole",
      status: "pending",
      latitude: BASE_LAT + 50 * ONE_METER_LAT_DEG,
      longitude: BASE_LON,
      created_at: "2026-11-20T09:00:00.000Z",
      publication: "public",
      visibility: "listed",
    },
  ]);

  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "pothole" },
    CITIZEN_A,
    mockClient
  );

  assert.equal(res.matches.length, 3);
  assert.equal(res.matches[0].id, "rep-20m");
  assert.equal(res.matches[0].distance_meters, 20);
  assert.equal(res.matches[1].id, "rep-50m");
  assert.equal(res.matches[1].distance_meters, 50);
  assert.equal(res.matches[2].id, "rep-80m");
  assert.equal(res.matches[2].distance_meters, 80);
});

test("Ranking 02: Equal distance breaks tie by newer created_at first", async () => {
  const mockClient = createMockSupabaseClient([
    {
      id: "rep-older",
      title: "Older pothole",
      category: "pothole",
      status: "pending",
      latitude: BASE_LAT + 40 * ONE_METER_LAT_DEG,
      longitude: BASE_LON,
      created_at: "2026-11-19T10:00:00.000Z",
      publication: "public",
      visibility: "listed",
    },
    {
      id: "rep-newer",
      title: "Newer pothole",
      category: "pothole",
      status: "pending",
      latitude: BASE_LAT + 40 * ONE_METER_LAT_DEG,
      longitude: BASE_LON,
      created_at: "2026-11-20T10:00:00.000Z",
      publication: "public",
      visibility: "listed",
    },
  ]);

  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "pothole" },
    CITIZEN_A,
    mockClient
  );

  assert.equal(res.matches.length, 2);
  assert.equal(res.matches[0].id, "rep-newer");
  assert.equal(res.matches[1].id, "rep-older");
});

test("Ranking 03: Equal distance and timestamp breaks tie deterministically by ID", async () => {
  const ts = "2026-11-20T12:00:00.000Z";
  const mockClient = createMockSupabaseClient([
    {
      id: "rep-zebra",
      title: "Zebra report",
      category: "pothole",
      status: "pending",
      latitude: BASE_LAT + 30 * ONE_METER_LAT_DEG,
      longitude: BASE_LON,
      created_at: ts,
      publication: "public",
      visibility: "listed",
    },
    {
      id: "rep-alpha",
      title: "Alpha report",
      category: "pothole",
      status: "pending",
      latitude: BASE_LAT + 30 * ONE_METER_LAT_DEG,
      longitude: BASE_LON,
      created_at: ts,
      publication: "public",
      visibility: "listed",
    },
  ]);

  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "pothole" },
    CITIZEN_A,
    mockClient
  );

  assert.equal(res.matches[0].id, "rep-alpha");
  assert.equal(res.matches[1].id, "rep-zebra");
});

test("Ranking 04: Capped at maximum 5 matches even when more candidates exist", async () => {
  const sevenRows = [10, 20, 30, 40, 50, 60, 70].map((dist, idx) => ({
    id: `rep-dist-${dist}`,
    title: `Pothole at ${dist}m`,
    category: "pothole",
    status: "pending",
    latitude: BASE_LAT + dist * ONE_METER_LAT_DEG,
    longitude: BASE_LON,
    created_at: new Date(Date.now() - idx * 1000).toISOString(),
    publication: "public",
    visibility: "listed",
  }));

  const mockClient = createMockSupabaseClient(sevenRows);

  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "pothole" },
    CITIZEN_A,
    mockClient
  );

  assert.equal(res.matches.length, 5);
  assert.equal(res.matches[0].distance_meters, 10);
  assert.equal(res.matches[4].distance_meters, 50);
});

test("Ranking 05: Empty results return clean data envelope with false flag", async () => {
  const mockClient = createMockSupabaseClient([]);

  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "pothole" },
    CITIZEN_A,
    mockClient
  );

  assert.equal(res.has_potential_duplicates, false);
  assert.equal(res.matches.length, 0);
  assert.equal(res.radius_meters, 100);
});

// =========================================================================
// SECTION 6: Geographic Edge-Cases & Security Isolation
// =========================================================================

test("EdgeCase 01: Date Line candidate matching (+179.9999 to -179.9999)", async () => {
  const mockClient = createMockSupabaseClient([
    {
      id: "antimeridian-match",
      title: "Broken streetlight across dateline",
      category: "streetlight",
      status: "pending",
      latitude: 0,
      longitude: -179.9999, // ~22 meters from +179.9999
      created_at: new Date().toISOString(),
      publication: "public",
      visibility: "listed",
    },
  ]);

  const res = await checkDuplicateReports(
    { latitude: 0, longitude: 179.9999, category: "streetlight" },
    CITIZEN_A,
    mockClient
  );

  assert.equal(res.has_potential_duplicates, true);
  assert.equal(res.matches[0].id, "antimeridian-match");
  assert.ok(res.matches[0].distance_meters < 50);
});

test("EdgeCase 02: Near-pole coordinates handle bounding box safely without division by zero", () => {
  const northPoleBox = getBoundingBox(89.99, 0, 100);
  assert.equal(northPoleBox.minLon, -180);
  assert.equal(northPoleBox.maxLon, 180);
  assert.equal(northPoleBox.crossesAntimeridian, false);

  const southPoleBox = getBoundingBox(-89.99, 0, 100);
  assert.equal(southPoleBox.minLon, -180);
  assert.equal(southPoleBox.maxLon, 180);
});

test("Security 01: Anonymous caller throws UNAUTHORIZED (401)", async () => {
  const mockClient = createMockSupabaseClient([]);

  await assert.rejects(
    async () => {
      // @ts-expect-error - testing missing caller
      await checkDuplicateReports({ latitude: BASE_LAT, longitude: BASE_LON, category: "pothole" }, null, mockClient);
    },
    (err: AppError) => {
      assert.equal(err.code, "UNAUTHORIZED");
      assert.equal(err.status, 401);
      return true;
    }
  );
});

test("Security 02: Private report belonging to another citizen is excluded (no leak)", async () => {
  const mockClient = createMockSupabaseClient([
    {
      id: "private-bob-report",
      title: "Private backyard pothole",
      category: "pothole",
      status: "pending",
      latitude: BASE_LAT + 10 * ONE_METER_LAT_DEG,
      longitude: BASE_LON,
      created_at: new Date().toISOString(),
      user_id: CITIZEN_B.id, // Bob's private report
      publication: "private",
      visibility: "hidden",
    },
  ]);

  // Alice checks duplicates; Bob's private report must be excluded
  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "pothole" },
    CITIZEN_A,
    mockClient
  );

  assert.equal(res.has_potential_duplicates, false);
  assert.equal(res.matches.length, 0);
});

test("Security 03: Caller's own private report IS visible to caller in duplicate check", async () => {
  const mockClient = createMockSupabaseClient([
    {
      id: "private-alice-report",
      title: "Alice personal driveway report",
      category: "pothole",
      status: "pending",
      latitude: BASE_LAT + 15 * ONE_METER_LAT_DEG,
      longitude: BASE_LON,
      created_at: new Date().toISOString(),
      user_id: CITIZEN_A.id, // Alice's own private report
      publication: "private",
      visibility: "hidden",
    },
  ]);

  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "pothole" },
    CITIZEN_A,
    mockClient
  );

  assert.equal(res.has_potential_duplicates, true);
  assert.equal(res.matches[0].id, "private-alice-report");
});

test("Security 04: Database failure maps to AppError INTERNAL_SERVER_ERROR (500)", async () => {
  const mockClient = createMockSupabaseClient([], true); // shouldFail = true

  await assert.rejects(
    async () => {
      await checkDuplicateReports(
        { latitude: BASE_LAT, longitude: BASE_LON, category: "pothole" },
        CITIZEN_A,
        mockClient
      );
    },
    (err: AppError) => {
      assert.equal(err.code, "INTERNAL_SERVER_ERROR");
      assert.equal(err.status, 500);
      return true;
    }
  );
});

test("Security 05: Administrative caller has authority to execute duplicate discovery", async () => {
  const mockClient = createMockSupabaseClient([]);

  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "pothole" },
    ADMIN_USER,
    mockClient
  );

  assert.equal(res.has_potential_duplicates, false);
  assert.equal(res.matches.length, 0);
});

// =========================================================================
// SECTION 7: Request Validation Schema Tests
// =========================================================================

test("Validation 01: Valid payload passes strict schema validation", () => {
  const parsed = checkDuplicatesSchema.safeParse({
    latitude: 22.5726,
    longitude: 88.3639,
    category: "pothole",
  });
  assert.equal(parsed.success, true);
});

test("Validation 02: Missing latitude is rejected", () => {
  const parsed = checkDuplicatesSchema.safeParse({
    longitude: 88.3639,
    category: "pothole",
  });
  assert.equal(parsed.success, false);
});

test("Validation 03: Out-of-bounds latitude (>90 or <-90) is rejected", () => {
  const parsedHigh = checkDuplicatesSchema.safeParse({
    latitude: 90.001,
    longitude: 88.3639,
    category: "pothole",
  });
  assert.equal(parsedHigh.success, false);

  const parsedLow = checkDuplicatesSchema.safeParse({
    latitude: -90.001,
    longitude: 88.3639,
    category: "pothole",
  });
  assert.equal(parsedLow.success, false);
});

test("Validation 04: Out-of-bounds longitude (>180 or <-180) is rejected", () => {
  const parsed = checkDuplicatesSchema.safeParse({
    latitude: 22.5726,
    longitude: 180.001,
    category: "pothole",
  });
  assert.equal(parsed.success, false);
});

test("Validation 05: Non-finite coordinates (NaN, Infinity) are rejected", () => {
  const parsedNaN = checkDuplicatesSchema.safeParse({
    latitude: NaN,
    longitude: 88.3639,
    category: "pothole",
  });
  assert.equal(parsedNaN.success, false);

  const parsedInf = checkDuplicatesSchema.safeParse({
    latitude: 22.5726,
    longitude: Infinity,
    category: "pothole",
  });
  assert.equal(parsedInf.success, false);
});

test("Validation 06: Unknown category is rejected", () => {
  const parsed = checkDuplicatesSchema.safeParse({
    latitude: 22.5726,
    longitude: 88.3639,
    category: "flying_saucer",
  });
  assert.equal(parsed.success, false);
});

test("Validation 07: Client-injected radius override is rejected by strict schema", () => {
  const parsed = checkDuplicatesSchema.safeParse({
    latitude: 22.5726,
    longitude: 88.3639,
    category: "pothole",
    radius_meters: 50000, // Attack 3
  });
  assert.equal(parsed.success, false);
});

test("Validation 08: Client-injected admin role or status is rejected by strict schema", () => {
  const parsedRole = checkDuplicatesSchema.safeParse({
    latitude: 22.5726,
    longitude: 88.3639,
    category: "pothole",
    role: "admin", // Attack 2
  });
  assert.equal(parsedRole.success, false);

  const parsedStatus = checkDuplicatesSchema.safeParse({
    latitude: 22.5726,
    longitude: 88.3639,
    category: "pothole",
    status: "in_progress",
  });
  assert.equal(parsedStatus.success, false);
});

test("Validation 09: Optional text hints pass when within bounds and trimmed", () => {
  const parsed = checkDuplicatesSchema.safeParse({
    latitude: 22.5726,
    longitude: 88.3639,
    category: "pothole",
    title_hint: "  Pothole on Main St  ",
    description_hint: "Near the university library",
  });
  assert.equal(parsed.success, true);
  if (parsed.success) {
    assert.equal(parsed.data.title_hint, "Pothole on Main St");
  }
});

test("Validation 10: Oversized text hint (>120 chars) is rejected", () => {
  const parsed = checkDuplicatesSchema.safeParse({
    latitude: 22.5726,
    longitude: 88.3639,
    category: "pothole",
    title_hint: "A".repeat(121),
  });
  assert.equal(parsed.success, false);
});

// =========================================================================
// SECTION 8: API Route Handler Contract & Response Envelope Tests
// =========================================================================

test("RouteContract 01: Successful duplicate search produces HTTP 200 with Cache-Control: no-store", async () => {
  const mockData = {
    has_potential_duplicates: true,
    radius_meters: 100,
    match_policy: "same_category_within_100m" as const,
    matches: [
      {
        id: "rep-001",
        title: "Pothole near library",
        category: "pothole" as const,
        status: "pending" as const,
        distance_meters: 35,
        created_at: new Date().toISOString(),
      },
    ],
  };

  const response = successResponse(mockData, {
    status: 200,
    message: "Potential nearby complaints found",
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");

  const json = await response.json();
  assert.equal(json.success, true);
  assert.equal(json.message, "Potential nearby complaints found");
  assert.equal(json.data.has_potential_duplicates, true);
  assert.equal(json.data.radius_meters, 100);
  assert.equal(json.data.matches.length, 1);
  assert.equal(json.data.matches[0].id, "rep-001");
});

test("RouteContract 02: Empty duplicate search produces HTTP 200 with Cache-Control: no-store", async () => {
  const mockData = {
    has_potential_duplicates: false,
    radius_meters: 100,
    match_policy: "same_category_within_100m" as const,
    matches: [],
  };

  const response = successResponse(mockData, {
    status: 200,
    message: "No potential nearby duplicates found",
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");

  const json = await response.json();
  assert.equal(json.success, true);
  assert.equal(json.message, "No potential nearby duplicates found");
  assert.equal(json.data.has_potential_duplicates, false);
  assert.equal(json.data.matches.length, 0);
});

test("RouteContract 03: Unauthorized request maps to HTTP 401 with no-store", async () => {
  const err = new AppError("UNAUTHORIZED", "Authentication required to check duplicate reports");
  const response = errorResponse(err);

  assert.equal(response.status, 401);
  assert.equal(response.headers.get("Cache-Control"), "no-store");

  const json = await response.json();
  assert.equal(json.success, false);
  assert.equal(json.error.code, "UNAUTHORIZED");
});

test("RouteContract 04: Validation failure maps to HTTP 422 with no-store", async () => {
  const err = new AppError("VALIDATION_ERROR", "Category must be one of: pothole, garbage, ...");
  const response = errorResponse(err);

  assert.equal(response.status, 422);
  assert.equal(response.headers.get("Cache-Control"), "no-store");

  const json = await response.json();
  assert.equal(json.success, false);
  assert.equal(json.error.code, "VALIDATION_ERROR");
});

test("RouteContract 05: Internal database failure maps to HTTP 500 with no-store", async () => {
  const err = new AppError("INTERNAL_SERVER_ERROR", "Failed to query nearby complaints");
  const response = errorResponse(err);

  assert.equal(response.status, 500);
  assert.equal(response.headers.get("Cache-Control"), "no-store");

  const json = await response.json();
  assert.equal(json.success, false);
  assert.equal(json.error.code, "INTERNAL_SERVER_ERROR");
});

test("RouteContract 06: Data projection strictly excludes sensitive fields (no user_id or notes)", async () => {
  const candidate = {
    id: "rep-safe-projection",
    title: "Streetlight outage",
    category: "streetlight",
    status: "pending",
    latitude: BASE_LAT + 10 * ONE_METER_LAT_DEG,
    longitude: BASE_LON,
    created_at: new Date().toISOString(),
    user_id: CITIZEN_B.id,
    publication: "public",
    visibility: "listed",
    // Privileged fields that must not be in final output:
    email: "secret@example.com",
    internal_notes: "Admin remarks",
  };

  const mockClient = createMockSupabaseClient([candidate]);

  const res = await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "streetlight" },
    CITIZEN_A,
    mockClient
  );

  assert.equal(res.matches.length, 1);
  const match = res.matches[0] as Record<string, unknown>;
  assert.equal(match.id, "rep-safe-projection");
  assert.equal(match.user_id, undefined);
  assert.equal(match.email, undefined);
  assert.equal(match.internal_notes, undefined);
  assert.equal(match.submission_key, undefined);
});

test("RouteContract 07: Read-only guarantee: no mutations performed against database", async () => {
  let insertCalled = false;
  let updateCalled = false;
  let deleteCalled = false;

  const mockClientWithSpy = {
    from: (table: string) => {
      assert.equal(table, "reports");
      const builder: Record<string, unknown> = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        gte: () => builder,
        lte: () => builder,
        or: () => builder,
        insert: () => {
          insertCalled = true;
          return builder;
        },
        update: () => {
          updateCalled = true;
          return builder;
        },
        delete: () => {
          deleteCalled = true;
          return builder;
        },
        then: (resolve: (val: unknown) => void) => {
          resolve({ data: [], error: null });
        },
      };
      return builder;
    },
  } as unknown as SupabaseClient;

  await checkDuplicateReports(
    { latitude: BASE_LAT, longitude: BASE_LON, category: "pothole" },
    CITIZEN_A,
    mockClientWithSpy
  );

  assert.equal(insertCalled, false, "Duplicate detection must NEVER call insert");
  assert.equal(updateCalled, false, "Duplicate detection must NEVER call update");
  assert.equal(deleteCalled, false, "Duplicate detection must NEVER call delete");
});

