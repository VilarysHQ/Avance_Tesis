import assert from 'node:assert/strict';
import test from 'node:test';

import express from 'express';

import leadsRoutes from '../src/routes/leads.routes.js';
import quotesRoutes from '../src/routes/quotes.routes.js';
import salesRoutes from '../src/routes/sales.routes.js';
import { hashAdminPassword, resetAdminSessionsForTests } from '../src/services/adminAuth.service.js';

test('todas las rutas comerciales administrativas rechazan acceso anónimo', async () => {
  process.env.ADMIN_EMAIL = 'admin@example.test';
  process.env.ADMIN_PASSWORD_HASH = await hashAdminPassword(
    'correct-horse-battery-staple',
    Buffer.from('0123456789abcdef')
  );
  process.env.ADMIN_SESSION_SECRET = 'test-session-secret-with-at-least-32-characters';
  process.env.CORS_ORIGIN = 'http://localhost:5173';
  resetAdminSessionsForTests();
  const app = express();
  app.use(express.json());
  app.use('/api/leads', leadsRoutes);
  app.use('/api/quotes', quotesRoutes);
  app.use('/api/sales', salesRoutes);
  const server = await new Promise((resolve) => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const base = `http://127.0.0.1:${server.address().port}/api`;

  try {
    const cases = [
      ['GET', '/leads'],
      ['POST', '/leads'],
      ['GET', '/quotes'],
      ['POST', '/quotes'],
      ['PATCH', '/quotes/1/status'],
      ['GET', '/sales'],
    ];
    for (const [method, path] of cases) {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: method === 'GET'
          ? undefined
          : { Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
        body: method === 'GET' ? undefined : '{}',
      });
      assert.equal(response.status, 401, `${method} ${path}`);
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
