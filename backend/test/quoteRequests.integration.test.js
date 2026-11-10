import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import app from '../src/app.js';
import { pool } from '../src/config/db.js';
import * as leadsService from '../src/services/leads.service.js';
import {
  createQuoteRequestWithDependencies,
} from '../src/services/quoteRequests.service.js';

const enabled =
  process.env.RUN_DB_INTEGRATION === 'true' &&
  Boolean(process.env.TEST_DATABASE_URL) &&
  process.env.DATABASE_URL === process.env.TEST_DATABASE_URL;

function body(requestId, notes = 'Prueba aislada E1.4') {
  return {
    request_id: requestId,
    lead: {
      full_name: 'Cliente ficticio E1.4',
      email: 'e14@example.test',
    },
    quote: {
      project_type: 'ecommerce',
      sections: '4-6',
      integrations: ['payment_gateway', 'admin_panel'],
      design_status: 'full',
      deadline: '2-4w',
      notes,
    },
  };
}

test('persistencia e idempotencia reales en PostgreSQL aislado', { skip: !enabled }, async () => {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });
  const { port } = server.address();

  const post = async (payload) => {
    const response = await fetch(`http://127.0.0.1:${port}/api/quote-requests`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return { status: response.status, body: await response.json() };
  };

  try {
    const initial = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM leads) AS leads,
         (SELECT COUNT(*)::int FROM quotes) AS quotes`
    );

    const firstId = randomUUID();
    const first = await post(body(firstId));
    assert.equal(first.status, 201);
    assert.equal(first.body.data.quote.lead_id, first.body.data.lead.id);
    assert.match(first.body.data.quote.code, /^COT-\d{8}-\d+$/);
    assert.equal(first.body.data.lead.status, 'new');
    assert.equal(first.body.data.quote.status, 'submitted');

    const replay = await post(body(firstId));
    assert.equal(replay.status, 201);
    assert.equal(replay.body.data.lead.id, first.body.data.lead.id);
    assert.equal(replay.body.data.quote.id, first.body.data.quote.id);

    const concurrentId = randomUUID();
    const [concurrentA, concurrentB] = await Promise.all([
      post(body(concurrentId, 'Solicitud concurrente')),
      post(body(concurrentId, 'Solicitud concurrente')),
    ]);
    assert.equal(concurrentA.status, 201);
    assert.equal(concurrentB.status, 201);
    assert.equal(concurrentA.body.data.lead.id, concurrentB.body.data.lead.id);
    assert.equal(concurrentA.body.data.quote.id, concurrentB.body.data.quote.id);

    const conflict = await post(body(firstId, 'Contenido diferente'));
    assert.equal(conflict.status, 409);

    const finalCounts = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM leads) AS leads,
         (SELECT COUNT(*)::int FROM quotes) AS quotes,
         (SELECT COUNT(*)::int FROM quote_request_idempotency) AS requests`
    );
    assert.equal(finalCounts.rows[0].leads - initial.rows[0].leads, 2);
    assert.equal(finalCounts.rows[0].quotes - initial.rows[0].quotes, 2);
    assert.equal(finalCounts.rows[0].requests, 2);

    const integrity = await pool.query(
      `SELECT q.id, q.lead_id, l.id AS related_lead_id
       FROM quotes q
       JOIN leads l ON l.id = q.lead_id`
    );
    assert.ok(integrity.rows.every((row) => row.lead_id === row.related_lead_id));

    const beforeRollback = await pool.query('SELECT COUNT(*)::int AS count FROM leads');
    const rollbackId = randomUUID();
    await assert.rejects(
      createQuoteRequestWithDependencies(
        {
          requestId: rollbackId,
          requestHash: 'f'.repeat(64),
          lead: {
            full_name: 'Rollback ficticio',
            company_name: null,
            email: 'rollback@example.test',
            phone: null,
            message: null,
            source: 'web_quote',
          },
          quote: { project_type: 'ecommerce' },
        },
        {
          databasePool: pool,
          createLead: leadsService.createLead,
          createQuote: async () => {
            throw new Error('fallo controlado después del lead');
          },
        }
      ),
      /fallo controlado/
    );
    const afterRollback = await pool.query('SELECT COUNT(*)::int AS count FROM leads');
    assert.equal(afterRollback.rows[0].count, beforeRollback.rows[0].count);
    const rolledBackReservation = await pool.query(
      'SELECT request_id FROM quote_request_idempotency WHERE request_id = $1',
      [rollbackId]
    );
    assert.equal(rolledBackReservation.rowCount, 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
});
