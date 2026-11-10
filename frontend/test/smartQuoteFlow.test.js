import assert from "node:assert/strict";
import test from "node:test";

import { QUOTE_STEPS } from "../src/data/quoteQuestions.js";
import {
  apiRequest,
  extractRequirements,
  getAdminSession,
  getQuotes,
  loginAdmin,
  logoutAdmin,
  updateQuoteStatus,
} from "../src/services/api.js";
import {
  createSmartInitialState,
  getConfirmedProgress,
  getSmartQuoteErrorMessage,
  smartQuoteReducer,
} from "../src/hooks/smartQuoteFlow.state.js";

function payload(overrides = {}) {
  const requirements = {
    projectType: "ecommerce",
    sections: null,
    integrations: ["payment_gateway"],
    designStatus: null,
    deadline: null,
    additionalDetails: "Control de inventario",
    businessDescription: "Venta de zapatillas",
    requestedFeatures: ["Control de inventario"],
    integrationDetails: ["Pagos en línea"],
    designNotes: null,
    deadlineDetails: null,
    ...overrides.requirements,
  };
  const fieldStatus = {
    projectType: "confirmed",
    sections: "missing",
    integrations: "confirmed",
    designStatus: "missing",
    deadline: "missing",
    ...overrides.fieldStatus,
  };
  const result = {
    success: true,
    requirements,
    fieldStatus,
    missingFields: ["sections", "designStatus", "deadline"],
    ambiguousFields: [],
    followUpQuestion: "¿Cuántas secciones necesitas?",
    assistantReply: "¿Necesitas 1 a 3 secciones, 4 a 6 secciones, 7 a 10 secciones o más de 10 secciones?",
    offeredOptionsField: "sections",
    offeredOptions: ["1-3", "4-6", "7-10", "10+"],
    complete: false,
    ...overrides,
  };
  result.requirements = requirements;
  result.fieldStatus = fieldStatus;
  return result;
}

function start(state, requestId = 1, message = "Necesito una tienda") {
  return smartQuoteReducer(state, {
    type: "REQUEST_STARTED",
    requestId,
    message,
    time: "10:00",
  });
}

function succeed(state, response, requestId = 1) {
  return smartQuoteReducer(state, {
    type: "REQUEST_SUCCEEDED",
    requestId,
    payload: response,
    time: "10:01",
  });
}

test("inicia la conversación en estado idle sin requisitos confirmados", () => {
  const state = createSmartInitialState("09:00");
  assert.equal(state.status, "idle");
  assert.equal(state.messages.length, 1);
  assert.deepEqual(getConfirmedProgress(state.context), { current: 0, total: 5 });
});

test("registra un mensaje válido y entra en loading", () => {
  const state = start(createSmartInitialState());
  assert.equal(state.status, "loading");
  assert.equal(state.messages.at(-1).role, "user");
  assert.equal(state.messages.at(-1).text, "Necesito una tienda");
});

test("aplica una respuesta validada y muestra seguimiento", () => {
  const state = succeed(start(createSmartInitialState()), payload());
  assert.equal(state.status, "ready");
  assert.equal(state.answers.projectType, "ecommerce");
  assert.match(state.messages.at(-1).text, /secciones/i);
});

test("muestra la respuesta conversacional validada en lugar de repetir mecánicamente el seguimiento", () => {
  const response = payload({
    assistantReply: "Las secciones son apartados como Inicio, Servicios y Contacto. ¿Cuántas necesitas?",
  });
  const state = succeed(start(createSmartInitialState()), response);
  assert.match(state.messages.at(-1).text, /Inicio, Servicios y Contacto/i);
  assert.notEqual(state.messages.at(-1).text, response.followUpQuestion);
});

test("conserva únicamente contexto estructurado acumulado", () => {
  const state = succeed(start(createSmartInitialState()), payload());
  assert.deepEqual(Object.keys(state.context), [
    "requirements",
    "fieldStatus",
    "lastQuestion",
    "lastAssistantReply",
    "lastOfferedOptionsField",
    "lastOfferedOptions",
  ]);
  assert.equal(state.context.lastQuestion, "¿Cuántas secciones necesitas?");
  assert.equal(
    state.context.lastAssistantReply,
    "¿Necesitas 1 a 3 secciones, 4 a 6 secciones, 7 a 10 secciones o más de 10 secciones?"
  );
  assert.equal(state.context.lastOfferedOptionsField, "sections");
  assert.deepEqual(state.context.lastOfferedOptions, ["1-3", "4-6", "7-10", "10+"]);
  assert.equal("messages" in state.context, false);
});

test("conserva una aclaración ambigua sin convertirla en dato confirmado", () => {
  const response = payload({
    requirements: { designStatus: null },
    fieldStatus: { designStatus: "ambiguous" },
    ambiguousFields: ["designStatus"],
    assistantReply: "¿Tienes el diseño completo o solamente logo y colores?",
    followUpQuestion: "¿Ya cuentas con diseño o identidad visual?",
  });
  const state = succeed(start(createSmartInitialState()), response);
  assert.equal(state.answers.designStatus, null);
  assert.equal(state.context.fieldStatus.designStatus, "ambiguous");
  assert.match(state.messages.at(-1).text, /completo|logo/i);
});

test("mantiene requisitos incompletos según la autoridad backend", () => {
  const state = succeed(start(createSmartInitialState()), payload());
  assert.equal(state.complete, false);
  assert.deepEqual(state.missingFields, ["sections", "designStatus", "deadline"]);
});

test("acepta completitud exclusivamente desde la respuesta backend", () => {
  const response = payload({
    requirements: {
      sections: "4-6",
      designStatus: "full",
      deadline: "none",
    },
    fieldStatus: {
      sections: "confirmed",
      designStatus: "confirmed",
      deadline: "confirmed",
    },
    missingFields: [],
    followUpQuestion: null,
    complete: true,
  });
  const state = succeed(start(createSmartInitialState()), response);
  assert.equal(state.status, "complete");
  assert.equal(state.complete, true);
});

test("una corrección reemplaza el estado anterior validado", () => {
  let state = succeed(start(createSmartInitialState()), payload());
  state = start(state, 2, "Corrección: necesito una web corporativa");
  state = succeed(
    state,
    payload({ requirements: { projectType: "corporate" } }),
    2
  );
  assert.equal(state.answers.projectType, "corporate");
});

test("un error de red conserva contexto y respuestas confirmadas", () => {
  let state = succeed(start(createSmartInitialState()), payload());
  const previousContext = state.context;
  state = start(state, 2, "Otro dato");
  state = smartQuoteReducer(state, {
    type: "REQUEST_FAILED",
    requestId: 2,
    error: getSmartQuoteErrorMessage({ isNetworkError: true }),
  });
  assert.equal(state.status, "error");
  assert.equal(state.context, previousContext);
  assert.equal(state.answers.projectType, "ecommerce");
});

test("envía un plazo, evita duplicados y permite reintentar conservando el contexto", () => {
  let state = succeed(start(createSmartInitialState()), payload());
  const previousContext = state.context;
  state = start(state, 2, "1 mes");
  assert.equal(state.status, "loading");
  assert.equal(state.messages.at(-1).text, "1 mes");

  const duplicate = start(state, 3, "1 mes me parece bien");
  assert.equal(duplicate, state);

  state = smartQuoteReducer(state, {
    type: "REQUEST_FAILED",
    requestId: 2,
    error: getSmartQuoteErrorMessage({ status: 504 }),
  });
  assert.equal(state.context, previousContext);
  assert.equal(state.status, "error");

  state = start(state, 4, "1 mes me parece bien");
  assert.equal(state.status, "loading");
  assert.equal(state.activeRequestId, 4);
  assert.equal(state.context, previousContext);
});

test("presenta un mensaje específico para timeout", () => {
  assert.match(getSmartQuoteErrorMessage({ isTimeout: true }), /tardó demasiado/i);
});

test("previene un segundo inicio mientras existe una solicitud pendiente", () => {
  const loading = start(createSmartInitialState(), 1);
  const duplicate = start(loading, 2, "Mensaje duplicado");
  assert.equal(duplicate, loading);
  assert.equal(duplicate.messages.length, 2);
});

test("ignora respuestas antiguas fuera de orden", () => {
  const loading = start(createSmartInitialState(), 2);
  const stale = succeed(loading, payload(), 1);
  assert.equal(stale, loading);
});

test("reinicia mensajes, contexto y completitud", () => {
  const populated = succeed(start(createSmartInitialState()), payload());
  const reset = smartQuoteReducer(populated, { type: "RESET", time: "11:00" });
  assert.equal(reset.status, "idle");
  assert.equal(reset.context, null);
  assert.equal(reset.complete, false);
  assert.equal(reset.messages.length, 1);
});

test("el cuestionario clásico conserva sus seis pasos", () => {
  assert.equal(QUOTE_STEPS.length, 6);
  assert.deepEqual(
    QUOTE_STEPS.map((step) => step.id),
    ["projectType", "sections", "integrations", "designStatus", "deadline", "additionalDetails"]
  );
});

test("la integración inteligente llama solo al endpoint de requerimientos", async (t) => {
  const originalFetch = globalThis.fetch;
  let request;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (url, options) => {
    request = { url, options };
    return {
      ok: true,
      status: 200,
      json: async () => payload(),
    };
  };

  await extractRequirements("Necesito una tienda", null);
  assert.match(request.url, /\/api\/ai\/requirements$/);
  assert.doesNotMatch(request.url, /quote-requests/);
  assert.deepEqual(JSON.parse(request.options.body), {
    message: "Necesito una tienda",
    context: null,
  });
});

test("apiRequest distingue timeout de un error de red", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (_url, options) =>
    new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("aborted")), {
        once: true,
      });
    });

  await assert.rejects(
    apiRequest("/slow", { timeout: 5 }),
    (error) => error.isTimeout === true && error.isNetworkError === false
  );
});

test("el cliente administrativo restaura cookie y envía CSRF en mutaciones", async (t) => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url, options });
    if (url.endsWith("/admin/auth/login") || url.endsWith("/admin/auth/session")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          user: { email: "admin@example.test", role: "admin" },
          csrfToken: "csrf-test-token",
        }),
      };
    }
    if (url.endsWith("/quotes/7/status")) {
      return { ok: true, status: 200, json: async () => ({ data: { id: 7 } }) };
    }
    if (url.endsWith("/quotes")) {
      return { ok: true, status: 200, json: async () => ({ data: [] }) };
    }
    return { ok: true, status: 200, json: async () => ({ success: true }) };
  };

  await loginAdmin("admin@example.test", "not-a-real-password");
  await getAdminSession();
  await getQuotes();
  await updateQuoteStatus(7, "contacted");
  await logoutAdmin();

  assert.equal(requests[0].options.credentials, "include");
  assert.equal(requests[1].options.credentials, "include");
  assert.equal(requests[2].options.credentials, "include");
  assert.equal(requests[2].options.headers["X-CSRF-Token"], undefined);
  assert.equal(requests[3].options.headers["X-CSRF-Token"], "csrf-test-token");
  assert.equal(requests[3].options.headers["Content-Type"], "application/json");
  assert.deepEqual(JSON.parse(requests[3].options.body), { status: "contacted" });
  assert.equal(requests[4].options.headers["X-CSRF-Token"], "csrf-test-token");
  assert.equal(requests[4].options.headers["Content-Type"], "application/json");
});

test("una respuesta 401 invalida la sesión administrativa local", async (t) => {
  const originalFetch = globalThis.fetch;
  let call = 0;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = async () => {
    call += 1;
    if (call === 1) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          user: { email: "admin@example.test", role: "admin" },
          csrfToken: "temporary-token",
        }),
      };
    }
    return {
      ok: false,
      status: 401,
      json: async () => ({ error: "Autenticación administrativa requerida." }),
    };
  };
  await loginAdmin("admin@example.test", "not-a-real-password");
  await assert.rejects(getQuotes(), (error) => error.status === 401);
});
