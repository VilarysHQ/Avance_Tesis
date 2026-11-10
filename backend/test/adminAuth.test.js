import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

import express from 'express';

import adminAuthRoutes from '../src/routes/adminAuth.routes.js';
import {
  authenticateAdmin,
  requireAdminRole,
  requireCsrf,
  requireTrustedOrigin,
} from '../src/middleware/adminAuth.js';
import { loginRateLimit } from '../src/middleware/rateLimit.js';
import {
  getAdminAuthConfig,
  hashAdminPassword,
  issueAdminSession,
  readAdminSession,
  resetAdminSessionsForTests,
} from '../src/services/adminAuth.service.js';

const ADMIN_EMAIL = 'admin@example.test';
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
  process.env.ADMIN_SESSION_TTL_MINUTES = '30';
  process.env.CORS_ORIGIN = ORIGIN;

  const app = express();
  app.use(express.json());
  app.use('/api/admin/auth', adminAuthRoutes);
  app.get('/api/protected', authenticateAdmin, requireAdminRole, (req, res) => {
    res.json({ email: req.adminSession.email });
  });
  app.post(
    '/api/protected',
    requireTrustedOrigin,
    authenticateAdmin,
    requireAdminRole,
    requireCsrf,
    (req, res) => res.json({ success: true })
  );

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

async function login(email = ADMIN_EMAIL, password = ADMIN_PASSWORD) {
  const response = await fetch(`${baseUrl}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: ORIGIN },
    body: JSON.stringify({ email, password }),
  });
  return { response, body: await response.json(), cookie: response.headers.get('set-cookie') };
}

test('login correcto crea una cookie HttpOnly y una sesión limitada', async () => {
  const result = await login();
  assert.equal(result.response.status, 200);
  assert.equal(result.body.success, true);
  assert.equal(result.body.user.role, 'admin');
  assert.equal(typeof result.body.csrfToken, 'string');
  assert.match(result.cookie, /admin_session=/);
  assert.match(result.cookie, /HttpOnly/i);
  assert.match(result.cookie, /SameSite=Lax/i);
});

test('contraseña incorrecta y usuario inexistente devuelven el mismo error', async () => {
  const wrongPassword = await login(ADMIN_EMAIL, 'incorrect-password-value');
  const unknownUser = await login('unknown@example.test', ADMIN_PASSWORD);
  assert.equal(wrongPassword.response.status, 401);
  assert.equal(unknownUser.response.status, 401);
  assert.deepEqual(wrongPassword.body, unknownUser.body);
});

test('sesión ausente e inválida no acceden a una ruta protegida', async () => {
  const absent = await fetch(`${baseUrl}/protected`);
  const invalid = await fetch(`${baseUrl}/protected`, {
    headers: { Cookie: 'admin_session=invalid.signature' },
  });
  assert.equal(absent.status, 401);
  assert.equal(invalid.status, 401);
});

test('una sesión expirada se elimina y deja de ser válida', () => {
  const config = getAdminAuthConfig();
  const issued = issueAdminSession({ email: ADMIN_EMAIL }, config, 1_000);
  assert.ok(readAdminSession(issued.token, config, 1_001));
  assert.equal(readAdminSession(issued.token, config, 1_000 + config.ttlMs + 1), null);
});

test('cerrar sesión revoca el identificador en el servidor', async () => {
  const result = await login();
  const logout = await fetch(`${baseUrl}/admin/auth/logout`, {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      Cookie: result.cookie,
      'X-CSRF-Token': result.body.csrfToken,
    },
  });
  assert.equal(logout.status, 200);
  const afterLogout = await fetch(`${baseUrl}/protected`, {
    headers: { Cookie: result.cookie },
  });
  assert.equal(afterLogout.status, 401);
});

test('un rol insuficiente recibe 403 aunque la sesión sea válida', async () => {
  const config = getAdminAuthConfig();
  const session = issueAdminSession({ email: ADMIN_EMAIL, role: 'viewer' }, config);
  const response = await fetch(`${baseUrl}/protected`, {
    headers: { Cookie: `admin_session=${session.token}` },
  });
  assert.equal(response.status, 403);
});

test('las mutaciones exigen origen confiable y token CSRF ligado a la sesión', async () => {
  const result = await login();
  const noCsrf = await fetch(`${baseUrl}/protected`, {
    method: 'POST',
    headers: { Origin: ORIGIN, Cookie: result.cookie },
  });
  const wrongOrigin = await fetch(`${baseUrl}/protected`, {
    method: 'POST',
    headers: {
      Origin: 'https://evil.example',
      Cookie: result.cookie,
      'X-CSRF-Token': result.body.csrfToken,
    },
  });
  const valid = await fetch(`${baseUrl}/protected`, {
    method: 'POST',
    headers: {
      Origin: ORIGIN,
      Cookie: result.cookie,
      'X-CSRF-Token': result.body.csrfToken,
    },
  });
  assert.equal(noCsrf.status, 403);
  assert.equal(wrongOrigin.status, 403);
  assert.equal(valid.status, 200);
});

test('el login limita intentos por cliente', async () => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const result = await login(ADMIN_EMAIL, 'incorrect-password-value');
    assert.equal(result.response.status, 401);
  }
  const blocked = await login(ADMIN_EMAIL, 'incorrect-password-value');
  assert.equal(blocked.response.status, 429);
  assert.ok(blocked.response.headers.get('retry-after'));
});
