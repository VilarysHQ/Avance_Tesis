import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAiChatController,
  MAX_AI_MESSAGE_LENGTH,
} from '../src/controllers/ai.controller.js';
import { GeminiServiceError } from '../src/services/gemini.service.js';

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

async function runController(body, generateReply) {
  const controller = createAiChatController(generateReply);
  const response = createResponse();
  await controller({ body }, response);
  return response;
}

test('devuelve una respuesta Gemini para un mensaje válido', async () => {
  let receivedMessage;
  const response = await runController(
    { message: '  Hola, necesito una tienda virtual  ' },
    async (message) => {
      receivedMessage = message;
      return '¿Qué productos deseas vender?';
    }
  );

  assert.equal(receivedMessage, 'Hola, necesito una tienda virtual');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, {
    success: true,
    reply: '¿Qué productos deseas vender?',
  });
});

test('rechaza mensajes vacíos', async () => {
  const response = await runController({ message: '   ' }, async () => 'no usado');
  assert.equal(response.statusCode, 400);
  assert.equal(response.body.success, false);
});

test('rechaza tipos de dato inválidos', async () => {
  const response = await runController({ message: 123 }, async () => 'no usado');
  assert.equal(response.statusCode, 400);
  assert.match(response.body.error, /cadena de texto/);
});

test('rechaza mensajes excesivamente largos', async () => {
  const response = await runController(
    { message: 'a'.repeat(MAX_AI_MESSAGE_LENGTH + 1) },
    async () => 'no usado'
  );
  assert.equal(response.statusCode, 413);
  assert.match(response.body.error, /2000 caracteres/);
});

test('traduce un error de proveedor a una respuesta segura', async () => {
  const secret = 'AIza-secret-that-must-not-leak';
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const response = await runController({ message: 'Hola' }, async () => {
      throw new GeminiServiceError(
        'AI_PROVIDER_ERROR',
        'No se pudo obtener una respuesta del asistente.',
        502,
        { cause: new Error(secret) }
      );
    });

    assert.equal(response.statusCode, 502);
    assert.equal(response.body.success, false);
    assert.doesNotMatch(JSON.stringify(response.body), new RegExp(secret));
  } finally {
    console.error = originalConsoleError;
  }
});

test('devuelve 504 ante un timeout simulado', async () => {
  const originalConsoleError = console.error;
  console.error = () => {};

  try {
    const response = await runController({ message: 'Hola' }, async () => {
      throw new GeminiServiceError(
        'AI_TIMEOUT',
        'El asistente tardó demasiado en responder. Intenta nuevamente.',
        504
      );
    });

    assert.equal(response.statusCode, 504);
    assert.match(response.body.error, /tardó demasiado/);
  } finally {
    console.error = originalConsoleError;
  }
});
