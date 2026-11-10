import assert from 'node:assert/strict';
import test from 'node:test';

import { createQuoteRequestWithDependencies } from '../src/services/quoteRequests.service.js';

function dependencies({ failQuote = false } = {}) {
  const queries = [];
  let released = false;
  const client = {
    async query(sql, params = []) {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        queries.push(sql);
      } else if (sql.includes('INSERT INTO quote_request_idempotency')) {
        queries.push('RESERVE');
      } else if (sql.includes('FOR UPDATE')) {
        queries.push('LOCK');
        return {
          rows: [{ request_hash: params[0] ? 'a'.repeat(64) : null, lead_id: null, quote_id: null }],
        };
      } else if (sql.includes('UPDATE quote_request_idempotency')) {
        queries.push('COMPLETE');
      }
      return { rows: [] };
    },
    release() {
      released = true;
    },
  };
  const databasePool = { connect: async () => client };
  const createLead = async (_lead, receivedClient) => {
    assert.equal(receivedClient, client);
    return { id: 41, full_name: 'Cliente de prueba' };
  };
  const createQuote = async (quote, receivedClient) => {
    assert.equal(receivedClient, client);
    assert.equal(quote.lead_id, 41);
    if (failQuote) throw new Error('quote insert failed');
    return { id: 52, lead_id: 41, code: 'COT-TEST-0052' };
  };
  return {
    values: { databasePool, createLead, createQuote },
    queries,
    wasReleased: () => released,
  };
}

test('crea lead y quote relacionados en una única transacción', async () => {
  const deps = dependencies();
  const result = await createQuoteRequestWithDependencies(
    {
      requestId: '123e4567-e89b-42d3-a456-426614174000',
      requestHash: 'a'.repeat(64),
      lead: { full_name: 'Cliente' },
      quote: { project_type: 'ecommerce' },
    },
    deps.values
  );
  assert.equal(result.quote.lead_id, result.lead.id);
  assert.match(result.quote.code, /^COT-/);
  assert.deepEqual(deps.queries, ['BEGIN', 'RESERVE', 'LOCK', 'COMPLETE', 'COMMIT']);
  assert.equal(deps.wasReleased(), true);
});

test('revierte la transacción si falla la cotización', async () => {
  const deps = dependencies({ failQuote: true });
  await assert.rejects(
    createQuoteRequestWithDependencies(
      {
        requestId: '123e4567-e89b-42d3-a456-426614174000',
        requestHash: 'a'.repeat(64),
        lead: { full_name: 'Cliente' },
        quote: { project_type: 'ecommerce' },
      },
      deps.values
    ),
    /quote insert failed/
  );
  assert.deepEqual(deps.queries, ['BEGIN', 'RESERVE', 'LOCK', 'ROLLBACK']);
  assert.equal(deps.wasReleased(), true);
});
