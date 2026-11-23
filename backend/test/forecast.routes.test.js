import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

import express from 'express';

import adminAuthRoutes from '../src/routes/adminAuth.routes.js';
import forecastRoutes from '../src/routes/forecast.routes.js';
import { loginRateLimit } from '../src/middleware/rateLimit.js';
import {
  hashAdminPassword,
  resetAdminSessionsForTests,
} from '../src/services/adminAuth.service.js';

const ADMIN_EMAIL = 'forecast-admin@example.test';
const ADMIN_PASSWORD = 'correct-horse-battery-staple';
const ORIGIN = 'http://localhost:5173';
let server;
let baseUrl;

before(async () => {
  process.env.ADMIN_EMAIL = ADMIN_EMAIL;
  process.env.ADMIN_PASSWORD_HASH = await hashAdminPassword(
    ADMIN_PASSWORD,
    Buffer.from('0123456789abcdef')
  );
  process.env.ADMIN_SESSION_SECRET = 'test-session-secret-with-at-least-32-characters';
  process.env.CORS_ORIGIN = ORIGIN;

  const app = express();
  app.use(express.json());
  app.use('/api/admin/auth', adminAuthRoutes);
  app.use('/api/reports/forecast', forecastRoutes);
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

beforeEach(() => {
  resetAdminSessionsForTests();
  loginRateLimit.reset();
});

test('GET /reports/forecast rechaza una sesión administrativa ausente', async () => {
  const response = await fetch(`${baseUrl}/reports/forecast`);
  assert.equal(response.status, 401);
});

test('GET /reports/forecast entrega el artefacto experimental a un administrador', async () => {
  const login = await fetch(`${baseUrl}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });
  assert.equal(login.status, 200);

  const response = await fetch(`${baseUrl}/reports/forecast`, {
    headers: { Cookie: login.headers.get('set-cookie') },
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(body.data.status, 'experimental');
  assert.equal(body.data.company_data, false);
  assert.equal(body.data.currency, 'GBP');
  assert.equal(body.data.history.length >= 30, true);
  assert.equal(body.data.forecast.length, 14);
  assert.equal(Number.isFinite(body.data.metrics.mae), true);
  assert.equal(Number.isFinite(body.data.metrics.baseline_mae), true);
  assert.equal(body.data.horizon_metrics.recursive_14_day.horizon_days, 14);
  assert.equal(body.data.horizon_metrics.recursive_14_day.blocks.length, 5);
  assert.equal(body.data.horizon_metrics.recursive_14_day.observations, 70);
});
