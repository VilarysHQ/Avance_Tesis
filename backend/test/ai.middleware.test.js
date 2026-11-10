import assert from 'node:assert/strict';
import test from 'node:test';

import {
  aiRateLimit,
  resetAiRateLimitForTests,
} from '../src/middleware/aiRateLimit.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { quoteRequestRateLimit } from '../src/middleware/rateLimit.js';

function createResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
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

test('responde de forma segura ante JSON malformado', () => {
  const response = createResponse();
  errorHandler({ type: 'entity.parse.failed', message: 'raw secret body' }, {}, response, () => {});

  assert.equal(response.statusCode, 400);
  assert.deepEqual(response.body, {
    success: false,
    error: 'El cuerpo JSON no es válido.',
  });
  assert.doesNotMatch(JSON.stringify(response.body), /raw secret body/);
});

test('responde con 413 ante un cuerpo demasiado grande', () => {
  const response = createResponse();
  errorHandler({ type: 'entity.too.large' }, {}, response, () => {});
  assert.equal(response.statusCode, 413);
});

test('sanitiza errores internos y detalles de PostgreSQL', () => {
  const response = createResponse();
  errorHandler(
    {
      code: '23503',
      message: 'violates foreign key secret_table',
      detail: 'Key (secret_id)=(42) is not present',
    },
    {},
    response,
    () => {}
  );
  assert.equal(response.statusCode, 400);
  assert.doesNotMatch(JSON.stringify(response.body), /secret|foreign key|42/i);

  const unknownResponse = createResponse();
  errorHandler(new Error('password=never-expose-this'), {}, unknownResponse, () => {});
  assert.equal(unknownResponse.statusCode, 500);
  assert.deepEqual(unknownResponse.body, { error: 'Error interno del servidor.' });
});

test('limita el endpoint a diez solicitudes por cliente y minuto', () => {
  resetAiRateLimitForTests();
  const request = { ip: '203.0.113.10' };

  for (let index = 0; index < 10; index += 1) {
    const response = createResponse();
    let called = false;
    aiRateLimit(request, response, () => {
      called = true;
    });
    assert.equal(called, true);
  }

  const blockedResponse = createResponse();
  aiRateLimit(request, blockedResponse, () => assert.fail('No debe continuar'));
  assert.equal(blockedResponse.statusCode, 429);
  assert.equal(blockedResponse.body.success, false);
  assert.ok(blockedResponse.headers['Retry-After']);
});

test('limita las solicitudes comerciales públicas sin afectar su controlador', () => {
  quoteRequestRateLimit.reset();
  const request = { ip: '203.0.113.20' };
  for (let index = 0; index < 10; index += 1) {
    const response = createResponse();
    let called = false;
    quoteRequestRateLimit(request, response, () => {
      called = true;
    });
    assert.equal(called, true);
  }
  const blocked = createResponse();
  quoteRequestRateLimit(request, blocked, () => assert.fail('No debe continuar'));
  assert.equal(blocked.statusCode, 429);
  assert.match(blocked.body.error, /cotización/i);
});
