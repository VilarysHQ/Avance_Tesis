import assert from 'node:assert/strict';
import test from 'node:test';

import { ApiError } from '@google/genai';

import {
  ASSISTANT_SYSTEM_INSTRUCTION,
  buildGeminiErrorDiagnostic,
  DEFAULT_GEMINI_MODEL,
  GEMINI_TIMEOUT_MS,
  generateGeminiReply,
  GeminiServiceError,
} from '../src/services/gemini.service.js';

test('construye la solicitud con modelo, instrucción y timeout seguros', async () => {
  let receivedApiKey;
  let request;

  const reply = await generateGeminiReply('Hola', {
    apiKey: 'test-key',
    timeoutMs: 3210,
    clientFactory: (apiKey) => {
      receivedApiKey = apiKey;
      return {
        models: {
          generateContent: async (value) => {
            request = value;
            return { text: '  Hola, ¿cómo puedo ayudarte?  ' };
          },
        },
      };
    },
  });

  assert.equal(receivedApiKey, 'test-key');
  assert.equal(request.model, DEFAULT_GEMINI_MODEL);
  assert.equal(request.contents, 'Hola');
  assert.equal(request.config.systemInstruction, ASSISTANT_SYSTEM_INSTRUCTION);
  assert.equal(request.config.httpOptions.timeout, 3210);
  assert.equal(request.config.thinkingConfig.thinkingLevel, 'LOW');
  assert.equal('temperature' in request.config, false);
  assert.equal(request.config.automaticContinuation, false);
  assert.equal(reply, 'Hola, ¿cómo puedo ayudarte?');
});

test('usa un timeout predeterminado de 30 segundos', async () => {
  let request;

  await generateGeminiReply('Hola', {
    apiKey: 'test-key',
    clientFactory: () => ({
      models: {
        generateContent: async (value) => {
          request = value;
          return { text: 'Hola' };
        },
      },
    }),
  });

  assert.equal(GEMINI_TIMEOUT_MS, 30_000);
  assert.equal(request.config.httpOptions.timeout, 30_000);
});

test('falla de forma segura cuando falta GEMINI_API_KEY', async () => {
  await assert.rejects(
    generateGeminiReply('Hola', { apiKey: '' }),
    (error) =>
      error instanceof GeminiServiceError &&
      error.code === 'AI_NOT_CONFIGURED' &&
      error.statusCode === 503
  );
});

test('rechaza una respuesta vacía de Gemini', async () => {
  await assert.rejects(
    generateGeminiReply('Hola', {
      apiKey: 'test-key',
      clientFactory: () => ({
        models: { generateContent: async () => ({ text: '   ' }) },
      }),
    }),
    (error) => error instanceof GeminiServiceError && error.code === 'AI_EMPTY_RESPONSE'
  );
});

test('clasifica errores de autenticación sin exponer el mensaje del proveedor', async () => {
  const providerSecret = 'provider rejected key AIza-secret';

  await assert.rejects(
    generateGeminiReply('Hola', {
      apiKey: 'test-key',
      clientFactory: () => ({
        models: {
          generateContent: async () => {
            throw new ApiError({ status: 401, message: providerSecret });
          },
        },
      }),
    }),
    (error) => {
      assert.equal(error.code, 'AI_AUTHENTICATION_ERROR');
      assert.equal(error.statusCode, 503);
      assert.doesNotMatch(error.publicMessage, /AIza-secret/);
      return true;
    }
  );
});

test('clasifica límites de cuota del proveedor', async () => {
  await assert.rejects(
    generateGeminiReply('Hola', {
      apiKey: 'test-key',
      clientFactory: () => ({
        models: {
          generateContent: async () => {
            throw new ApiError({ status: 429, message: 'quota details' });
          },
        },
      }),
    }),
    (error) => error.code === 'AI_QUOTA_EXCEEDED' && error.statusCode === 503
  );
});

test('clasifica HTTP 504 del proveedor como timeout', async () => {
  await assert.rejects(
    generateGeminiReply('Hola', {
      apiKey: 'test-key',
      clientFactory: () => ({
        models: {
          generateContent: async () => {
            throw new ApiError({ status: 504, message: 'DEADLINE_EXCEEDED' });
          },
        },
      }),
    }),
    (error) =>
      error instanceof GeminiServiceError &&
      error.code === 'AI_TIMEOUT' &&
      error.statusCode === 504 &&
      !error.publicMessage.includes('DEADLINE_EXCEEDED')
  );
});

for (const status of [500, 502, 503]) {
  test(`clasifica HTTP ${status} como indisponibilidad del proveedor`, async () => {
    const providerError = new ApiError({
      status,
      message: JSON.stringify({
        error: {
          code: status,
          status: 'UNAVAILABLE',
          message: 'secret-provider-detail',
        },
      }),
    });

    const diagnostic = buildGeminiErrorDiagnostic(providerError, 1234.6);

    assert.deepEqual(diagnostic, {
      className: 'ApiError',
      errorName: 'ApiError',
      httpStatus: status,
      providerStatus: 'UNAVAILABLE',
      technicalCode: String(status),
      category: 'provider_unavailable',
      durationMs: 1235,
    });
    assert.doesNotMatch(JSON.stringify(diagnostic), /secret-provider-detail/);

    await assert.rejects(
      generateGeminiReply('Hola', {
        apiKey: 'test-key',
        clientFactory: () => ({
          models: {
            generateContent: async () => {
              throw providerError;
            },
          },
        }),
      }),
      (error) =>
        error instanceof GeminiServiceError &&
        error.code === 'AI_PROVIDER_ERROR' &&
        error.statusCode === 502 &&
        !error.publicMessage.includes('secret-provider-detail')
    );
  });
}

test('diagnostica errores de transporte sin exponer mensajes', () => {
  const transportError = new TypeError('request failed with secret-key');
  transportError.cause = { code: 'ECONNRESET', message: 'sensitive transport detail' };

  const diagnostic = buildGeminiErrorDiagnostic(transportError, 98.2);

  assert.deepEqual(diagnostic, {
    className: 'TypeError',
    errorName: 'TypeError',
    httpStatus: null,
    providerStatus: null,
    technicalCode: 'ECONNRESET',
    category: 'transport',
    durationMs: 98,
  });
  assert.doesNotMatch(JSON.stringify(diagnostic), /secret-key|sensitive transport detail/);
});

test('diagnostica respuestas vacías sin datos sensibles', () => {
  const error = new GeminiServiceError(
    'AI_EMPTY_RESPONSE',
    'El asistente no generó una respuesta utilizable.',
    502
  );
  const diagnostic = buildGeminiErrorDiagnostic(error, 42);

  assert.equal(diagnostic.category, 'empty_response');
  assert.equal(diagnostic.technicalCode, 'AI_EMPTY_RESPONSE');
  assert.equal(diagnostic.httpStatus, null);
});

test('diagnostica errores desconocidos sin serializar el objeto original', () => {
  const error = new Error('secret unknown detail');
  error.extra = { apiKey: 'AIza-secret' };
  const diagnostic = buildGeminiErrorDiagnostic(error, 7);

  assert.equal(diagnostic.category, 'unknown');
  assert.equal(diagnostic.className, 'Error');
  assert.doesNotMatch(JSON.stringify(diagnostic), /secret|AIza/);
});

test('el diagnóstico está desactivado por defecto', async () => {
  const previousValue = process.env.GEMINI_DIAGNOSTICS;
  const originalConsoleError = console.error;
  const logs = [];
  delete process.env.GEMINI_DIAGNOSTICS;
  console.error = (...args) => logs.push(args);

  try {
    await assert.rejects(
      generateGeminiReply('Hola', {
        apiKey: 'test-key',
        clientFactory: () => ({
          models: {
            generateContent: async () => {
              throw new ApiError({ status: 500, message: 'secret detail' });
            },
          },
        }),
      })
    );
    assert.equal(logs.length, 0);
  } finally {
    console.error = originalConsoleError;
    if (previousValue === undefined) delete process.env.GEMINI_DIAGNOSTICS;
    else process.env.GEMINI_DIAGNOSTICS = previousValue;
  }
});

test('el diagnóstico activado registra únicamente campos sanitizados', async () => {
  const previousValue = process.env.GEMINI_DIAGNOSTICS;
  const originalConsoleError = console.error;
  const logs = [];
  process.env.GEMINI_DIAGNOSTICS = 'true';
  console.error = (...args) => logs.push(args);

  try {
    await assert.rejects(
      generateGeminiReply('Hola', {
        apiKey: 'test-key',
        clientFactory: () => ({
          models: {
            generateContent: async () => {
              throw new ApiError({
                status: 503,
                message: JSON.stringify({
                  error: {
                    code: 503,
                    status: 'UNAVAILABLE',
                    message: 'secret provider payload',
                  },
                }),
              });
            },
          },
        }),
      })
    );

    assert.equal(logs.length, 1);
    assert.equal(logs[0][0], '[ai:diagnostic]');
    const diagnostic = JSON.parse(logs[0][1]);
    assert.equal(diagnostic.httpStatus, 503);
    assert.equal(diagnostic.providerStatus, 'UNAVAILABLE');
    assert.equal(diagnostic.category, 'provider_unavailable');
    assert.doesNotMatch(logs[0][1], /secret provider payload|test-key/);
  } finally {
    console.error = originalConsoleError;
    if (previousValue === undefined) delete process.env.GEMINI_DIAGNOSTICS;
    else process.env.GEMINI_DIAGNOSTICS = previousValue;
  }
});

test('clasifica un timeout del SDK', async () => {
  const timeout = new Error('internal timeout detail');
  timeout.name = 'RequestTimeoutError';

  await assert.rejects(
    generateGeminiReply('Hola', {
      apiKey: 'test-key',
      clientFactory: () => ({
        models: {
          generateContent: async () => {
            throw timeout;
          },
        },
      }),
    }),
    (error) => error.code === 'AI_TIMEOUT' && error.statusCode === 504
  );
});
