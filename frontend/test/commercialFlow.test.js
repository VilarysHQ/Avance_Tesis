import assert from "node:assert/strict";
import test from "node:test";

import { calculateQuote } from "../src/utils/calculateQuote.js";
import {
  buildQuoteNotes,
  buildQuoteRequestPayload,
} from "../src/utils/buildQuoteRequest.js";
import { createSubmissionGuard } from "../src/utils/submissionGuard.js";

const answers = {
  projectType: "ecommerce",
  sections: "4-6",
  integrations: ["payment_gateway", "admin_panel"],
  designStatus: "full",
  deadline: "2-4w",
  additionalDetails: "Venta de zapatillas con inventario",
};

const requirements = {
  businessDescription: "Tienda virtual para vender zapatillas",
  requestedFeatures: ["Control de inventario"],
  integrationDetails: ["Pagos en línea"],
  designNotes: "Necesita diseño completo",
  deadlineDetails: "Entre dos y cuatro semanas",
};

const contact = {
  fullName: "Cliente de prueba",
  companyName: "",
  email: "prueba@example.test",
  phone: "",
  message: "",
};
const requestId = "123e4567-e89b-42d3-a456-426614174000";

test("convierte los cinco requisitos al contrato comercial sin enviar importes", () => {
  const payload = buildQuoteRequestPayload({
    answers,
    contact,
    requestId,
    requirements,
  });
  assert.equal(payload.request_id, requestId);
  assert.deepEqual(payload.quote.integrations, ["payment_gateway", "admin_panel"]);
  assert.equal(payload.quote.project_type, "ecommerce");
  assert.equal(payload.quote.sections, "4-6");
  assert.equal(payload.quote.design_status, "full");
  assert.equal(payload.quote.deadline, "2-4w");
  assert.equal("estimated_min" in payload.quote, false);
  assert.equal("estimated_max" in payload.quote, false);
});

test("calcula la vista preliminar exclusivamente con las reglas existentes", () => {
  const quote = calculateQuote(answers);
  assert.equal(quote.estimatedMin, 5050);
  assert.equal(quote.estimatedMax, 6450);
  assert.equal(quote.weeksMin, 5);
  assert.equal(quote.weeksMax, 8);
});

test("conserva detalles adicionales para revisión sin convertirlos en importes", () => {
  const notes = buildQuoteNotes(answers, requirements);
  assert.match(notes, /Control de inventario/);
  assert.match(notes, /Pagos en línea/);
  assert.match(notes, /Necesita diseño completo/);
  assert.doesNotMatch(notes, /S\/|precio|subtotal/i);
});

test("mantiene compatible el cuestionario clásico sin requisitos inteligentes", () => {
  const payload = buildQuoteRequestPayload({ answers, contact, requestId });
  assert.equal(payload.quote.project_type, "ecommerce");
  assert.match(payload.quote.notes, /Detalle adicional/);
  assert.doesNotMatch(payload.quote.notes, /Descripción del negocio/);
});

test("evita dos envíos simultáneos por múltiples clics", () => {
  const guard = createSubmissionGuard();
  assert.equal(guard.tryStart(), true);
  assert.equal(guard.tryStart(), false);
  guard.finish();
  assert.equal(guard.tryStart(), true);
});
