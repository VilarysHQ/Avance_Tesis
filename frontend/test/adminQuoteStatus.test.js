import assert from "node:assert/strict";
import test from "node:test";

import {
  isAllowedQuoteStatus,
  saveConfirmedQuoteStatus,
} from "../src/utils/adminQuoteStatus.js";
import {
  QUOTE_STATUS_OPTIONS,
  getStatusLabel,
} from "../src/utils/quoteStatus.js";
import { createSubmissionGuard } from "../src/utils/submissionGuard.js";

const originalQuotes = [
  { id: 7, status: "submitted", code: "COT-TEST-0007" },
  { id: 8, status: "contacted", code: "COT-TEST-0008" },
];

test("el selector representa el estado actual y todo el catálogo del backend", () => {
  assert.equal(getStatusLabel(originalQuotes[0].status), "Nueva");
  assert.equal(getStatusLabel("draft"), "Borrador");
  assert.ok(QUOTE_STATUS_OPTIONS.some((option) => option.value === "submitted"));
  assert.ok(QUOTE_STATUS_OPTIONS.some((option) => option.value === "negotiation"));
  assert.equal(isAllowedQuoteStatus("invented"), false);
});
test("una actualización confirmada reemplaza únicamente la cotización respondida", async () => {
  let requestPayload;
  const result = await saveConfirmedQuoteStatus({
    quotes: originalQuotes,
    quoteId: 7,
    status: "negotiation",
    request: async (id, status) => {
      requestPayload = { id, status };
      return { data: { id, status, updated_at: "2026-11-09T12:00:00.000Z" } };
    },
  });

  assert.deepEqual(requestPayload, { id: 7, status: "negotiation" });
  assert.equal(result.updated.status, "negotiation");
  assert.equal(result.quotes[0].status, "negotiation");
  assert.equal(result.quotes[1], originalQuotes[1]);
  assert.equal(originalQuotes[0].status, "submitted");
});
for (const statusCode of [400, 401, 403, 500]) {
  test(`HTTP ${statusCode} conserva el estado anterior y propaga el error`, async () => {
    const error = Object.assign(new Error(`HTTP ${statusCode}`), { status: statusCode });
    await assert.rejects(
      saveConfirmedQuoteStatus({
        quotes: originalQuotes,
        quoteId: 7,
        status: "negotiation",
        request: async () => {
          throw error;
        },
      }),
      (received) => received === error
    );
    assert.equal(originalQuotes[0].status, "submitted");
  });
}

test("el guard impide dos guardados simultáneos y permite reintentar", () => {
  const guard = createSubmissionGuard();
  assert.equal(guard.tryStart(), true);
  assert.equal(guard.tryStart(), false);
  guard.finish();
  assert.equal(guard.tryStart(), true);
});
