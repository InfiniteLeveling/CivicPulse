import assert from "node:assert/strict";
import test from "node:test";
import { ADMIN_NAV_GROUPS, isActiveAdminRoute } from "../src/config/admin-navigation.ts";

test("admin navigation defines structured navigation groups with correct properties", () => {
  assert.equal(ADMIN_NAV_GROUPS.length, 3);

  const groupNames = ADMIN_NAV_GROUPS.map((g) => g.group);
  assert.deepEqual(groupNames, ["MAIN", "OPERATIONS", "PORTALS"]);

  const mainGroup = ADMIN_NAV_GROUPS.find((g) => g.group === "MAIN");
  assert.ok(mainGroup);
  assert.equal(mainGroup.items.length, 2);

  const overviewItem = mainGroup.items.find((i) => i.href === "/admin");
  assert.ok(overviewItem);
  assert.equal(overviewItem.label, "Overview");
  assert.equal(overviewItem.available, true);
  assert.equal(overviewItem.exact, true);
  assert.ok(overviewItem.icon);

  const complaintsItem = mainGroup.items.find((i) => i.href === "/admin/complaints");
  assert.ok(complaintsItem);
  assert.equal(complaintsItem.label, "Complaints Queue");
  assert.equal(complaintsItem.available, false);
  assert.equal(complaintsItem.phaseBadge, "Phase 18");

  const opsGroup = ADMIN_NAV_GROUPS.find((g) => g.group === "OPERATIONS");
  assert.ok(opsGroup);
  const analyticsItem = opsGroup.items.find((i) => i.href === "/admin/analytics");
  assert.ok(analyticsItem);
  assert.equal(analyticsItem.label, "City Analytics");
  assert.equal(analyticsItem.available, false);
  assert.equal(analyticsItem.phaseBadge, "Phase 20");

  const portalsGroup = ADMIN_NAV_GROUPS.find((g) => g.group === "PORTALS");
  assert.ok(portalsGroup);
  const mapItem = portalsGroup.items.find((i) => i.href === "/map");
  assert.ok(mapItem);
  assert.equal(mapItem.label, "Live Civic Map");
  assert.equal(mapItem.available, true);

  const publicItem = portalsGroup.items.find((i) => i.href === "/");
  assert.ok(publicItem);
  assert.equal(publicItem.label, "Public Website");
  assert.equal(publicItem.available, true);
});

test("isActiveAdminRoute accurately distinguishes exact /admin from sub-routes", () => {
  // Exact /admin matching
  assert.equal(isActiveAdminRoute("/admin", "/admin"), true);
  assert.equal(isActiveAdminRoute("/admin", "/admin", true), true);

  // Sub-routes must NOT highlight root /admin
  assert.equal(isActiveAdminRoute("/admin/complaints", "/admin"), false);
  assert.equal(isActiveAdminRoute("/admin/analytics", "/admin"), false);
  assert.equal(isActiveAdminRoute("/admin/settings", "/admin"), false);
  assert.equal(isActiveAdminRoute("/admin-settings", "/admin"), false);
  assert.equal(isActiveAdminRoute("/dashboard", "/admin"), false);
  assert.equal(isActiveAdminRoute("/", "/admin"), false);
});

test("isActiveAdminRoute supports prefix matching for nested administration sections", () => {
  assert.equal(isActiveAdminRoute("/admin/complaints", "/admin/complaints"), true);
  assert.equal(isActiveAdminRoute("/admin/complaints/cm-12345", "/admin/complaints"), true);
  assert.equal(isActiveAdminRoute("/admin/complaints/triage/batch", "/admin/complaints"), true);

  // Different paths should not match
  assert.equal(isActiveAdminRoute("/admin/analytics", "/admin/complaints"), false);
  assert.equal(isActiveAdminRoute("/admin", "/admin/complaints"), false);
  assert.equal(isActiveAdminRoute("/admin/complaints-archived", "/admin/complaints"), false);
});

test("isActiveAdminRoute handles exact parameter flag when enforced", () => {
  assert.equal(isActiveAdminRoute("/admin/complaints/123", "/admin/complaints", true), false);
  assert.equal(isActiveAdminRoute("/admin/complaints", "/admin/complaints", true), true);
});

test("isActiveAdminRoute handles empty and invalid inputs gracefully", () => {
  assert.equal(isActiveAdminRoute("", "/admin"), false);
  assert.equal(isActiveAdminRoute("/other", "/admin"), false);
});
