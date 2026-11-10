import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createQuoteController,
  updateQuoteStatusController,
} from '../src/controllers/quotes.controller.js';

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

test('POST /quotes también ignora importes proporcionados por el cliente', async () => {
  let persisted;
  const controller = createQuoteController({
    findLead: async () => ({ id: 8 }),
    persistQuote: async (quote) => {
      persisted = quote;
      return { id: 10, code: 'COT-TEST-0010', ...quote };
    },
  });
  const res = response();
  await controller(
    {
      body: {
        lead_id: 8,
        project_type: 'corporate_web',
        sections: '1-3',
        integrations: ['none'],
        design_status: 'ready',
        deadline: 'none',
        estimated_min: 0,
        estimated_max: 999999,
      },
    },
    res,
    assert.fail
  );

  assert.equal(res.statusCode, 201);
  assert.equal(persisted.estimated_min, 1350);
  assert.equal(persisted.estimated_max, 1700);
});

test('PATCH /quotes/:id/status acepta y persiste un estado permitido', async () => {
  let received;
  const controller = updateQuoteStatusController(async (id, status) => {
    received = { id, status };
    return { id, status };
  });
  const res = response();
  await controller(
    { params: { id: '7' }, body: { status: 'negotiation' } },
    res,
    assert.fail
  );
  assert.deepEqual(received, { id: 7, status: 'negotiation' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { data: { id: 7, status: 'negotiation' } });
});

test('PATCH /quotes/:id/status rechaza un cuerpo sin status o fuera del catálogo', async () => {
  let calls = 0;
  const controller = updateQuoteStatusController(async () => {
    calls += 1;
  });

  for (const body of [{}, { status: 'invented' }]) {
    const res = response();
    await controller({ params: { id: '7' }, body }, res, assert.fail);
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'Validación fallida.');
  }
  assert.equal(calls, 0);
});
