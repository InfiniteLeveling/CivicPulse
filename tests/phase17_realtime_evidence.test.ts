import test from "node:test";
import assert from "node:assert/strict";

import {
  REALTIME_CONFIG,
  getReportChannel,
  isValidReportChannel,
  extractReportIdFromChannel,
} from "../src/config/realtime.ts";
import { EVIDENCE_CONFIG } from "../src/config/evidence.ts";
import {
  generateResolutionDraftStoragePath,
  parseResolutionDraftStoragePath,
  isResolutionDraftStoragePath,
} from "../src/utils/storage-path.ts";
import {
  validateImageSignature,
  MAX_FILE_SIZE_BYTES,
} from "../src/utils/file-validation.ts";
import {
  updateStatusSchema,
  reportIdSchema,
} from "../src/validators/status.schema.ts";
import {
  reportIdParamSchema,
  resolutionDraftPathSchema,
  evidenceSignedUrlQuerySchema,
} from "../src/validators/evidence.schema.ts";
import {
  updateReportStatus,
} from "../src/services/status.service.ts";
import {
  verifyResolutionDraftPath,
  uploadAdminResolutionDraftImage,
} from "../src/services/storage.service.ts";
import {
  getReportEvidence,
} from "../src/services/evidence.service.ts";
import { emitRealtimeReportEvent } from "../src/services/realtime.service.ts";
import { AppError } from "../src/utils/app-error.ts";
import { successResponse, errorResponse } from "../src/utils/api-response.ts";
import type { AuthenticatedUser } from "../src/types/auth.ts";
import type { RealtimeReportEventPayload } from "../src/types/realtime.ts";
import type { SupabaseClient } from "@supabase/supabase-js";

// Test Identities
const CITIZEN_USER: AuthenticatedUser = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "citizen@example.com",
  role: "citizen",
};

const ADMIN_USER: AuthenticatedUser = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "admin@civicpulse.org",
  role: "admin",
};

const OTHER_ADMIN: AuthenticatedUser = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "other_admin@civicpulse.org",
  role: "admin",
};

const REPORT_A = "44444444-4444-4444-8444-444444444444";
const REPORT_B = "55555555-5555-4555-8555-555555555555";

// Mock Magic Byte Buffers
const VALID_JPEG_HEADER = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const VALID_PNG_HEADER = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const VALID_WEBP_HEADER = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
]);
const INVALID_PDF_HEADER = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
const INVALID_SVG_HEADER = new Uint8Array(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"));
const INVALID_EXE_HEADER = new Uint8Array([0x4d, 0x5a, 0x90, 0x00]);

// ============================================================================
// Group 1: Realtime Configuration & Channel Topics
// ============================================================================

test("Realtime 01: getReportChannel generates correct private channel topic", () => {
  const channel = getReportChannel(REPORT_A);
  assert.equal(channel, `report:${REPORT_A}`);
});

test("Realtime 02: isValidReportChannel validates exact UUID topic structure", () => {
  assert.equal(isValidReportChannel(`report:${REPORT_A}`), true);
  assert.equal(isValidReportChannel("report:invalid-uuid"), false);
  assert.equal(isValidReportChannel("report:*"), false);
  assert.equal(isValidReportChannel("reports:public"), false);
  assert.equal(isValidReportChannel(""), false);
});

test("Realtime 03: extractReportIdFromChannel correctly extracts report UUID", () => {
  const extracted = extractReportIdFromChannel(`report:${REPORT_A}`);
  assert.equal(extracted, REPORT_A);

  const invalid = extractReportIdFromChannel("reports:public");
  assert.equal(invalid, null);
});

test("Realtime 04: REALTIME_CONFIG defines canonical events and change types", () => {
  assert.equal(REALTIME_CONFIG.EVENTS.REPORT_UPDATED, "report_updated");
  assert.equal(REALTIME_CONFIG.EVENTS.REPORT_CREATED, "report_created");
  assert.equal(REALTIME_CONFIG.CHANGE_TYPES.STATUS_CHANGED, "status_changed");
  assert.equal(REALTIME_CONFIG.CHANGE_TYPES.DEPARTMENT_CHANGED, "department_changed");
  assert.equal(REALTIME_CONFIG.CHANGE_TYPES.RESOLUTION_COMPLETED, "resolution_completed");
  assert.equal(REALTIME_CONFIG.PUBLIC_REPORTS_CHANNEL, "reports:public");
});

test("Realtime 05: Event payload strictly contains minimal data without sensitive fields", () => {
  const payload: RealtimeReportEventPayload = {
    event: "report_updated",
    report_id: REPORT_A,
    change_type: "resolution_completed",
    occurred_at: new Date().toISOString(),
  };

  // Verify absence of sensitive properties
  const keys = Object.keys(payload);
  assert.deepEqual(keys.sort(), ["change_type", "event", "occurred_at", "report_id"].sort());
  assert.equal("email" in payload, false);
  assert.equal("notes" in payload, false);
  assert.equal("signed_url" in payload, false);
  assert.equal("token" in payload, false);
});

// ============================================================================
// Group 2: Resolution Evidence Storage Path Utilities & Traversal Guards
// ============================================================================

test("Path 01: generateResolutionDraftStoragePath creates valid scoped path", () => {
  const path = generateResolutionDraftStoragePath(ADMIN_USER.id, REPORT_A, "jpg");
  assert.match(
    path,
    new RegExp(`^resolution-drafts/${ADMIN_USER.id}/${REPORT_A}/[0-9a-fA-F-]{36}\\.jpg$`)
  );
  assert.equal(isResolutionDraftStoragePath(path), true);
});

test("Path 02: parseResolutionDraftStoragePath decomposes valid components", () => {
  const path = generateResolutionDraftStoragePath(ADMIN_USER.id, REPORT_A, "png");
  const parsed = parseResolutionDraftStoragePath(path);
  assert.equal(parsed.isValid, true);
  assert.equal(parsed.adminId, ADMIN_USER.id);
  assert.equal(parsed.reportId, REPORT_A);
  assert.equal(parsed.extension, "png");
  assert.ok(parsed.imageId);
});

test("Path 03: parseResolutionDraftStoragePath rejects directory traversal attempts", () => {
  assert.equal(parseResolutionDraftStoragePath("../etc/passwd").isValid, false);
  assert.equal(
    parseResolutionDraftStoragePath(`resolution-drafts/${ADMIN_USER.id}/../${REPORT_A}/x.jpg`).isValid,
    false
  );
  assert.equal(
    parseResolutionDraftStoragePath(`resolution-drafts//${ADMIN_USER.id}/${REPORT_A}/x.jpg`).isValid,
    false
  );
  assert.equal(
    parseResolutionDraftStoragePath(`resolution-drafts\\${ADMIN_USER.id}\\${REPORT_A}\\x.jpg`).isValid,
    false
  );
});

test("Path 04: verifyResolutionDraftPath permits matching admin and report", () => {
  const path = generateResolutionDraftStoragePath(ADMIN_USER.id, REPORT_A, "webp");
  const verified = verifyResolutionDraftPath(ADMIN_USER.id, REPORT_A, path);
  assert.equal(verified.isValid, true);
  assert.equal(verified.storagePath, path);
});

test("Path 05: verifyResolutionDraftPath rejects cross-admin or cross-report path tampering", () => {
  const path = generateResolutionDraftStoragePath(ADMIN_USER.id, REPORT_A, "jpg");

  // Attempting access by different admin
  assert.throws(
    () => verifyResolutionDraftPath(OTHER_ADMIN.id, REPORT_A, path),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      assert.equal(err.status, 403);
      return true;
    }
  );

  // Attempting association to different report
  assert.throws(
    () => verifyResolutionDraftPath(ADMIN_USER.id, REPORT_B, path),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "FORBIDDEN");
      assert.equal(err.status, 403);
      return true;
    }
  );
});

// ============================================================================
// Group 3: File Validation & Security Guards
// ============================================================================

test("FileVal 01: Valid image magic byte signatures are accepted", () => {
  const jpeg = validateImageSignature(VALID_JPEG_HEADER);
  assert.equal(jpeg.mimeType, "image/jpeg");
  assert.equal(jpeg.extension, "jpg");

  const png = validateImageSignature(VALID_PNG_HEADER);
  assert.equal(png.mimeType, "image/png");
  assert.equal(png.extension, "png");

  const webp = validateImageSignature(VALID_WEBP_HEADER);
  assert.equal(webp.mimeType, "image/webp");
  assert.equal(webp.extension, "webp");
});

test("FileVal 02: Corrupted or empty file buffer (< 4 bytes) is rejected", () => {
  assert.throws(
    () => validateImageSignature(new Uint8Array([0x01, 0x02])),
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "VALIDATION_ERROR");
      return true;
    }
  );
});

test("FileVal 03: Non-image formats (PDF, SVG, EXE) are strictly rejected", () => {
  assert.throws(() => validateImageSignature(INVALID_PDF_HEADER));
  assert.throws(() => validateImageSignature(INVALID_SVG_HEADER));
  assert.throws(() => validateImageSignature(INVALID_EXE_HEADER));
});

test("FileVal 04: EVIDENCE_CONFIG enforces 3 MB max file size", () => {
  assert.equal(EVIDENCE_CONFIG.MAX_FILE_SIZE_BYTES, 3 * 1024 * 1024);
  assert.equal(MAX_FILE_SIZE_BYTES, 3 * 1024 * 1024);
});

test("FileVal 05: uploadAdminResolutionDraftImage validates file and stores to private path", async () => {
  let uploadedPath = "";
  let uploadedUpsert = true;

  const mockSupabase = {
    storage: {
      from: (bucket: string) => {
        assert.equal(bucket, EVIDENCE_CONFIG.BUCKET_NAME);
        return {
          upload: async (path: string, _buf: Uint8Array, opts: { upsert: boolean }) => {
            uploadedPath = path;
            uploadedUpsert = opts.upsert;
            return { error: null };
          },
        };
      },
    },
  } as unknown as SupabaseClient;

  const res = await uploadAdminResolutionDraftImage(
    ADMIN_USER.id,
    REPORT_A,
    VALID_JPEG_HEADER,
    "image/jpeg",
    mockSupabase
  );

  assert.equal(res.bucket, "civic-evidence");
  assert.equal(res.mime_type, "image/jpeg");
  assert.equal(res.status, "temporary");
  assert.equal(uploadedUpsert, false);
  assert.ok(uploadedPath.startsWith(`resolution-drafts/${ADMIN_USER.id}/${REPORT_A}/`));
});

// ============================================================================
// Group 4: Status Schema Validation (after_image_path Extension)
// ============================================================================

test("Schema 01: updateStatusSchema accepts status with optional after_image_path", () => {
  const validPath = generateResolutionDraftStoragePath(ADMIN_USER.id, REPORT_A, "jpg");
  const parsed = updateStatusSchema.parse({
    status: "resolved",
    expected_status: "in_progress",
    notes: "Repaired pothole with asphalt overlay",
    after_image_path: validPath,
  });

  assert.equal(parsed.status, "resolved");
  assert.equal(parsed.expected_status, "in_progress");
  assert.equal(parsed.after_image_path, validPath);
});

test("Schema 02: updateStatusSchema strictly rejects injected client fields", () => {
  assert.throws(
    () =>
      updateStatusSchema.parse({
        status: "resolved",
        role: "admin", // forbidden injected field
      }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      return true;
    }
  );
});

test("Schema 03: resolutionDraftPathSchema validates valid draft path and rejects malformed", () => {
  const validPath = generateResolutionDraftStoragePath(ADMIN_USER.id, REPORT_A, "jpg");
  assert.equal(resolutionDraftPathSchema.safeParse(validPath).success, true);
  assert.equal(resolutionDraftPathSchema.safeParse("drafts/invalid/path.jpg").success, false);
  assert.equal(resolutionDraftPathSchema.safeParse("").success, false);
});

test("Schema 04: reportIdSchema and reportIdParamSchema validate UUID v4 parameters", () => {
  assert.equal(reportIdSchema.safeParse(REPORT_A).success, true);
  assert.equal(reportIdSchema.safeParse("not-a-uuid").success, false);
  assert.equal(reportIdParamSchema.safeParse(REPORT_A).success, true);
  assert.equal(reportIdParamSchema.safeParse("12345").success, false);
});

test("Schema 05: evidenceSignedUrlQuerySchema enforces valid integer bounds for signed URL TTL", () => {
  const valid = evidenceSignedUrlQuerySchema.parse({ expires_in: "1200" });
  assert.equal(valid.expires_in, 1200);

  const def = evidenceSignedUrlQuerySchema.parse({});
  assert.equal(def.expires_in, EVIDENCE_CONFIG.DEFAULT_SIGNED_URL_EXPIRY_SECONDS);

  assert.throws(() => evidenceSignedUrlQuerySchema.parse({ expires_in: "10" })); // < 60
  assert.throws(() => evidenceSignedUrlQuerySchema.parse({ expires_in: "10000" })); // > 3600
});

// ============================================================================
// Group 5: Mandatory Resolution Evidence Enforcement (Service Level)
// ============================================================================

test("Service 01: updateReportStatus throws 403 FORBIDDEN when called by non-admin citizen", async () => {
  await assert.rejects(
    async () => {
      await updateReportStatus(
        REPORT_A,
        { status: "in_progress" },
        CITIZEN_USER
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

test("Service 02: updateReportStatus to 'resolved' throws 422 when after_image_path is missing", async () => {
  await assert.rejects(
    async () => {
      await updateReportStatus(
        REPORT_A,
        {
          status: "resolved",
          expected_status: "in_progress",
          // after_image_path omitted
        },
        ADMIN_USER
      );
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "VALIDATION_ERROR");
      assert.equal(err.status, 422);
      assert.match(err.message, /after-repair image/i);
      return true;
    }
  );
});

test("Service 03: updateReportStatus to 'in_progress' does not require after_image_path", async () => {
  const mockSupabase = {
    rpc: async () => ({
      data: {
        id: REPORT_A,
        previous_status: "pending",
        status: "in_progress",
        updated_at: new Date().toISOString(),
        resolved_at: null,
        history_entry_id: "hist-uuid-1",
        version: 2,
      },
      error: null,
    }),
    channel: () => ({
      send: async () => ({}),
    }),
  } as unknown as SupabaseClient;

  const result = await updateReportStatus(
    REPORT_A,
    { status: "in_progress", expected_status: "pending" },
    ADMIN_USER,
    mockSupabase
  );

  assert.equal(result.status, "in_progress");
  assert.equal(result.resolved_at, null);
});

test("Service 04: updateReportStatus to 'resolved' with valid evidence succeeds atomically", async () => {
  const validPath = generateResolutionDraftStoragePath(ADMIN_USER.id, REPORT_A, "jpg");

  const mockSupabase = {
    rpc: async (fn: string, args: Record<string, unknown>) => {
      assert.equal(fn, "civicpulse_transition_report_status");
      assert.equal(args.p_report_id, REPORT_A);
      assert.equal(args.p_new_status, "resolved");
      assert.equal(args.p_after_image_path, validPath);

      return {
        data: {
          id: REPORT_A,
          previous_status: "in_progress",
          status: "resolved",
          updated_at: new Date().toISOString(),
          resolved_at: new Date().toISOString(),
          history_entry_id: "hist-uuid-2",
          version: 3,
          resolution_evidence: {
            image_id: "img-after-1",
            storage_path: validPath,
            type: "after",
          },
        },
        error: null,
      };
    },
    channel: () => ({
      send: async () => ({}),
    }),
  } as unknown as SupabaseClient;

  const result = await updateReportStatus(
    REPORT_A,
    {
      status: "resolved",
      expected_status: "in_progress",
      after_image_path: validPath,
      notes: "Hazardous pothole filled with cold mix asphalt",
    },
    ADMIN_USER,
    mockSupabase
  );

  assert.equal(result.status, "resolved");
  assert.ok(result.resolved_at);
  assert.equal(result.resolution_evidence?.type, "after");
  assert.equal(result.resolution_evidence?.storage_path, validPath);
});

test("Service 05: updateReportStatus maps RPC optimistic concurrency conflict to HTTP 409", async () => {
  const validPath = generateResolutionDraftStoragePath(ADMIN_USER.id, REPORT_A, "jpg");

  const mockSupabase = {
    rpc: async () => ({
      data: null,
      error: {
        code: "23514",
        message: "STATUS_CONFLICT: Complaint status changed. Expected in_progress but current status is resolved",
      },
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await updateReportStatus(
        REPORT_A,
        {
          status: "resolved",
          expected_status: "in_progress",
          after_image_path: validPath,
        },
        ADMIN_USER,
        mockSupabase
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

test("Service 06: updateReportStatus maps cross-report duplicate image error to HTTP 409", async () => {
  const validPath = generateResolutionDraftStoragePath(ADMIN_USER.id, REPORT_A, "jpg");

  const mockSupabase = {
    rpc: async () => ({
      data: null,
      error: {
        code: "23505",
        message: "CONFLICT: This evidence image has already been associated with another report",
      },
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await updateReportStatus(
        REPORT_A,
        {
          status: "resolved",
          expected_status: "in_progress",
          after_image_path: validPath,
        },
        ADMIN_USER,
        mockSupabase
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

// ============================================================================
// Group 6: Evidence Retrieval & Visibility
// ============================================================================

test("Evidence 01: getReportEvidence throws 404 for nonexistent complaint", async () => {
  const mockSupabase = {
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
      await getReportEvidence("00000000-0000-0000-0000-000000000000", null, 900, mockSupabase);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "NOT_FOUND");
      assert.equal(err.status, 404);
      return true;
    }
  );
});

test("Evidence 02: getReportEvidence conceals private report from unauthorized visitor with 404", async () => {
  const mockSupabase = {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: {
              id: REPORT_A,
              status: "pending",
              publication: "private",
              visibility: "unlisted",
              user_id: "other-user-uuid",
              resolved_at: null,
            },
            error: null,
          }),
        }),
      }),
    }),
  } as unknown as SupabaseClient;

  await assert.rejects(
    async () => {
      await getReportEvidence(REPORT_A, CITIZEN_USER, 900, mockSupabase);
    },
    (err: unknown) => {
      assert.ok(err instanceof AppError);
      assert.equal(err.code, "NOT_FOUND");
      assert.equal(err.status, 404);
      return true;
    }
  );
});

test("Evidence 03: getReportEvidence categorizes before and after images and includes notice", async () => {
  const beforeImg = {
    id: "img-before-1",
    storage_path: `drafts/${CITIZEN_USER.id}/original.jpg`,
    type: "before",
    created_at: "2026-11-20T10:00:00Z",
  };
  const afterImg = {
    id: "img-after-1",
    storage_path: `resolution-drafts/${ADMIN_USER.id}/${REPORT_A}/resolved.jpg`,
    type: "after",
    created_at: "2026-11-21T15:00:00Z",
  };

  const mockSupabase = {
    from: (table: string) => {
      if (table === "reports") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: {
                  id: REPORT_A,
                  status: "resolved",
                  publication: "public",
                  visibility: "listed",
                  user_id: CITIZEN_USER.id,
                  resolved_at: "2026-11-21T15:00:00Z",
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
            order: async () => ({
              data: [beforeImg, afterImg],
              error: null,
            }),
          }),
        }),
      };
    },
    storage: {
      from: () => ({
        createSignedUrl: async (path: string) => ({
          data: { signedUrl: `https://mock-storage.supabase.co/${path}?token=mock` },
          error: null,
        }),
      }),
    },
  } as unknown as SupabaseClient;

  const evidence = await getReportEvidence(REPORT_A, null, 900, mockSupabase);

  assert.equal(evidence.report_id, REPORT_A);
  assert.equal(evidence.status, "resolved");
  assert.equal(evidence.before_images.length, 1);
  assert.equal(evidence.before_images[0].type, "before");
  assert.equal(evidence.after_images.length, 1);
  assert.equal(evidence.after_images[0].type, "after");
  assert.ok(evidence.attribution_notice);
  assert.match(evidence.attribution_notice, /administrator/i);
});

// ============================================================================
// Group 7: Realtime Broadcast Service Resilience
// ============================================================================

test("Broadcast 01: emitRealtimeReportEvent broadcasts successfully to report channel", async () => {
  let broadcastSent = false;
  const mockSupabase = {
    channel: (topic: string) => {
      assert.equal(topic, `report:${REPORT_A}`);
      return {
        send: async (msg: unknown) => {
          assert.ok(msg);
          broadcastSent = true;
          return {};
        },
      };
    },
  } as unknown as SupabaseClient;

  const result = await emitRealtimeReportEvent(
    {
      event: "report_updated",
      report_id: REPORT_A,
      change_type: "status_changed",
      occurred_at: new Date().toISOString(),
    },
    mockSupabase
  );

  assert.equal(result, true);
  assert.equal(broadcastSent, true);
});

test("Broadcast 02: emitRealtimeReportEvent targets public channel for report_created", async () => {
  let targetTopic = "";
  const mockSupabase = {
    channel: (topic: string) => {
      targetTopic = topic;
      return {
        send: async () => ({}),
      };
    },
  } as unknown as SupabaseClient;

  await emitRealtimeReportEvent(
    {
      event: "report_created",
      report_id: REPORT_A,
      change_type: "report_created",
      occurred_at: new Date().toISOString(),
    },
    mockSupabase
  );

  assert.equal(targetTopic, "reports:public");
});

test("Broadcast 03: emitRealtimeReportEvent catches errors gracefully without throwing", async () => {
  const mockSupabase = {
    channel: () => {
      throw new Error("Simulated WebSocket connection failure");
    },
  } as unknown as SupabaseClient;

  const result = await emitRealtimeReportEvent(
    {
      event: "report_updated",
      report_id: REPORT_A,
      change_type: "status_changed",
      occurred_at: new Date().toISOString(),
    },
    mockSupabase
  );

  // Broadcast error is caught, returns false, and does not throw exception
  assert.equal(result, false);
});

// ============================================================================
// Group 8: Route Contract & Envelopes
// ============================================================================

test("RouteContract 01: API success response sets Cache-Control: no-store", () => {
  const response = successResponse({ ok: true }, { status: 201 });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("RouteContract 02: API error response maps AppError and sets Cache-Control: no-store", () => {
  const response = errorResponse(new AppError("CONFLICT", "Status conflict"));
  assert.equal(response.status, 409);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
