import assert from "node:assert/strict";
import test from "node:test";
import { ApiError, apiRequest } from "../src/lib/api/client.ts";
import { endpoints } from "../src/lib/api/endpoints.ts";

test("the endpoint catalog uses the backend's methods and paths", () => {
  const expected = [
    [endpoints.upload, "POST", "/api/uploads"],
    [endpoints.classify, "POST", "/api/ai/classify"],
    [endpoints.duplicates, "POST", "/api/reports/duplicates"],
    [endpoints.createReport, "POST", "/api/reports"],
    [endpoints.listReports, "GET", "/api/reports"],
    [endpoints.report("a/b"), "GET", "/api/reports/a%2Fb"],
    [endpoints.support("a/b"), "POST", "/api/reports/a%2Fb/support"],
    [endpoints.triage("a/b"), "PATCH", "/api/admin/reports/a%2Fb/triage"],
    [endpoints.status("a/b"), "PATCH", "/api/admin/reports/a%2Fb/status"],
    [endpoints.departments, "GET", "/api/admin/departments"],
    [endpoints.myStats, "GET", "/api/stats?scope=mine"],
    [endpoints.adminStats, "GET", "/api/stats?scope=admin"],
  ];
  for (const [actual, method, path] of expected) {
    assert.deepEqual(actual, { method, path });
  }
  assert.throws(() => endpoints.report(".."), TypeError);
});

test("GET forwards filters, cookies and cancellation and unwraps data", async (t) => {
  const { signal } = new AbortController();
  t.mock.method(globalThis, "fetch", (path, init) => {
    assert.equal(path, "/api/reports?q=Main+St");
    assert.equal(init.credentials, "same-origin");
    assert.equal(init.method, "GET");
    assert.equal(init.body, undefined);
    assert.equal(init.signal, signal);
    return Response.json({ data: { items: [] } });
  });
  const query = new URLSearchParams({ q: "Main St" });
  assert.deepEqual(await apiRequest(endpoints.listReports, { query, signal }), { items: [] });
});

test("writes serialize JSON, leave multipart boundaries to fetch, and allow bodyless support", async (t) => {
  const fetch = t.mock.method(globalThis, "fetch", () => Response.json({ data: null }));
  const body = { status: "in_progress", version: 1 };
  assert.equal(await apiRequest(endpoints.status("1"), { body }), null);
  const patch = fetch.mock.calls[0].arguments[1];
  assert.equal(patch.method, "PATCH");
  assert.equal(patch.headers.get("Content-Type"), "application/json");
  assert.deepEqual(JSON.parse(patch.body), body);

  const form = new FormData();
  form.set("purpose", "issue");
  await apiRequest(endpoints.upload, { body: form });
  const upload = fetch.mock.calls[1].arguments[1];
  assert.equal(upload.method, "POST");
  assert.equal(upload.body, form);
  assert.equal(upload.headers.has("Content-Type"), false);

  await apiRequest(endpoints.support("1"));
  assert.equal(fetch.mock.calls[2].arguments[1].body, undefined);
});

test("documented errors retain HTTP status, code, message and safe details", async (t) => {
  const error = { code: "DUPLICATE_CANDIDATES", message: "Review nearby issues", details: { candidates: [] } };
  t.mock.method(globalThis, "fetch", () => Response.json({ error }, { status: 409 }));
  await assert.rejects(apiRequest(endpoints.createReport), { name: "ApiError", status: 409, ...error });
});

test("empty, malformed and unexpected envelopes fail without exposing raw bodies", async (t) => {
  const replies = [
    [new Response("gateway debug output", { status: 502 }), "HTTP_ERROR"],
    [new Response(null, { status: 204 }), "INVALID_RESPONSE"],
    [Response.json({}), "INVALID_RESPONSE"],
    [new Response("unexpected text"), "INVALID_RESPONSE"],
  ];
  for (const [reply, code] of replies) {
    const fetch = t.mock.method(globalThis, "fetch", () => reply);
    await assert.rejects(apiRequest(endpoints.listReports), (error) =>
      error instanceof ApiError && error.code === code && error.status === reply.status
      && !error.message.includes("debug output"),
    );
    fetch.mock.restore();
  }
});

test("network failure is readable and caller cancellation stays distinguishable", async (t) => {
  const signal = AbortSignal.abort();
  t.mock.method(globalThis, "fetch", (_url, init) => {
    init.signal?.throwIfAborted();
    throw new TypeError("fetch failed");
  });
  await assert.rejects(apiRequest(endpoints.myStats), { code: "NETWORK_ERROR" });
  await assert.rejects(apiRequest(endpoints.myStats, { signal }), { name: "AbortError" });
});
