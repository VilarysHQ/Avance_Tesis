import assert from 'node:assert/strict';
import test from 'node:test';

import aiRoutes from '../src/routes/ai.routes.js';
import { createRequirementsController } from '../src/controllers/requirements.controller.js';
import { GeminiServiceError } from '../src/services/gemini.service.js';
import { RequirementsValidationError } from '../src/services/requirements.service.js';

function createResponse() {
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

async function run(body, extractor) {
  const response = createResponse();
  await createRequirementsController(extractor)({ body }, response);
  return response;
}

test('POST /requirements devuelve el contrato estructurado', async () => {
  let received;
  let receivedSignal;
  const result = {
    requirements: { projectType: 'landing' },
    fieldStatus: { projectType: 'confirmed' },
    missingFields: ['sections'],
    ambiguousFields: [],
    followUpQuestion: '¿Cuántas secciones necesitas?',
    assistantReply: 'Entendido. ¿Cuántas secciones necesitas?',
    offeredOptionsField: 'sections',
    offeredOptions: ['1-3', '4-6', '7-10', '10+'],
    complete: false,
  };
  const response = await run(
    { message: '  Necesito una landing  ', context: null },
    async (message, context, options) => {
      received = { message, context };
      receivedSignal = options.signal;
      return result;
    }
  );

  assert.deepEqual(received, { message: 'Necesito una landing', context: null });
  assert.ok(receivedSignal instanceof AbortSignal);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { success: true, ...result });
  assert.equal(response.body.assistantReply, result.assistantReply);
});

test('rechaza mensajes vacíos, tipos inválidos y entradas excesivas', async () => {
  const unused = async () => assert.fail('No debe invocar Gemini');
  assert.equal((await run({ message: '' }, unused)).statusCode, 400);
  assert.equal((await run({ message: 7 }, unused)).statusCode, 400);
  assert.equal((await run({ message: 'x'.repeat(2001) }, unused)).statusCode, 413);
});

test('rechaza contexto inválido con HTTP 400 seguro', async () => {
  const response = await run({ message: 'Hola', context: { secret: 'raw-value' } }, async () => {
    throw new RequirementsValidationError('El estado de requerimientos contiene campos no permitidos.');
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
  assert.doesNotMatch(JSON.stringify(response.body), /raw-value/);
});

test('traduce errores del proveedor y timeout sin filtrar causas', async () => {
  const originalConsoleError = console.error;
  console.error = () => {};
  try {
    for (const [code, statusCode] of [
      ['AI_PROVIDER_ERROR', 502],
      ['AI_TIMEOUT', 504],
    ]) {
      const response = await run({ message: 'Hola' }, async () => {
        throw new GeminiServiceError(code, 'Mensaje público seguro.', statusCode, {
          cause: new Error('AIza-secret'),
        });
      });
      assert.equal(response.statusCode, statusCode);
      assert.equal(response.body.error, 'Mensaje público seguro.');
      assert.doesNotMatch(JSON.stringify(response.body), /AIza-secret/);
    }
  } finally {
    console.error = originalConsoleError;
  }
});

test('conserva disponibles el chat existente y el endpoint de requerimientos', () => {
  const paths = aiRoutes.stack.filter((layer) => layer.route).map((layer) => layer.route.path);
  assert.deepEqual(paths, ['/chat', '/requirements']);
});
