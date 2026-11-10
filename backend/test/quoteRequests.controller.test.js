import assert from 'node:assert/strict';
import test from 'node:test';

import { createQuoteRequestController } from '../src/controllers/quoteRequests.controller.js';
import { IdempotencyConflictError } from '../src/services/quoteRequests.service.js';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';

function response() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function validBody(overrides = {}) {
  return {
    request_id: REQUEST_ID,
    lead: {
      full_name: 'Cliente de prueba',
      email: 'prueba@example.test',
      source: 'manipulated-source',
    },
    quote: {
      project_type: 'ecommerce',
      sections: '4-6',
      integrations: ['payment_gateway', 'admin_panel'],
      design_status: 'full',
      deadline: '2-4w',
      notes: 'Funcionalidad adicional: inventario',
      estimated_min: 1,
      estimated_max: 999999,
      status: 'won',
    },
    ...overrides,
  };
}

async function run(body, persist) {
  const res = response();
  let forwardedError = null;
  await createQuoteRequestController(persist)({ body }, res, (error) => {
    forwardedError = error;
  });
  return { res, forwardedError };
}

test('ignora importes manipulados y persiste únicamente el cálculo del servidor', async () => {
  let persisted;
  const result = { lead: { id: 7 }, quote: { id: 9, lead_id: 7, code: 'COT-TEST-0009' } };
  const { res } = await run(validBody(), async (payload) => {
    persisted = payload;
    return result;
  });

  assert.equal(res.statusCode, 201);
  assert.deepEqual(res.body, { data: result });
  assert.equal(persisted.lead.source, 'web_quote');
  assert.equal(persisted.requestId, REQUEST_ID);
  assert.match(persisted.requestHash, /^[0-9a-f]{64}$/);
  assert.equal(persisted.quote.status, 'submitted');
  assert.equal(persisted.quote.estimated_min, 5050);
  assert.equal(persisted.quote.estimated_max, 6450);
  assert.equal(persisted.quote.estimated_weeks_min, 5);
  assert.equal(persisted.quote.estimated_weeks_max, 8);
  assert.match(persisted.quote.notes, /inventario/);
});

test('no persiste una conversación con requisitos incompletos', async () => {
  let calls = 0;
  const body = validBody();
  body.quote.sections = null;
  const { res } = await run(body, async () => {
    calls += 1;
  });
  assert.equal(res.statusCode, 400);
  assert.equal(calls, 0);
  assert.match(res.body.details.join(' '), /sections/);
});

test('propaga un error de persistencia sin simular confirmación', async () => {
  const failure = new Error('database unavailable');
  const { res, forwardedError } = await run(validBody(), async () => {
    throw failure;
  });
  assert.equal(res.body, null);
  assert.equal(forwardedError, failure);
});

test('devuelve 409 al reutilizar una clave con contenido diferente', async () => {
  const { res, forwardedError } = await run(validBody(), async () => {
    throw new IdempotencyConflictError();
  });
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error, 'La solicitud ya fue utilizada con otro contenido.');
  assert.equal(forwardedError, null);
});
