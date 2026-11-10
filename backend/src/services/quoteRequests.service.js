import { pool } from '../config/db.js';
import * as leadsService from './leads.service.js';
import * as quotesService from './quotes.service.js';

export class IdempotencyConflictError extends Error {
  constructor() {
    super('La clave de solicitud ya fue utilizada con otro contenido.');
    this.name = 'IdempotencyConflictError';
    this.code = 'IDEMPOTENCY_CONFLICT';
  }
}

async function reserveRequest(client, requestId, requestHash) {
  await client.query(
    `INSERT INTO quote_request_idempotency (request_id, request_hash)
     VALUES ($1, $2)
     ON CONFLICT (request_id) DO NOTHING`,
    [requestId, requestHash]
  );

  const { rows } = await client.query(
    `SELECT request_hash, lead_id, quote_id
     FROM quote_request_idempotency
     WHERE request_id = $1
     FOR UPDATE`,
    [requestId]
  );
  const reservation = rows[0];
  if (!reservation || reservation.request_hash !== requestHash) {
    throw new IdempotencyConflictError();
  }
  return reservation;
}

async function loadCompletedRequest(client, leadId, quoteId) {
  const leadResult = await client.query(
    `SELECT id, full_name, company_name, email, phone, message, source, status,
            created_at, updated_at
     FROM leads
     WHERE id = $1`,
    [leadId]
  );
  const quoteResult = await client.query(
    `SELECT id, lead_id, code, project_type, sections_count, estimated_min,
            estimated_max, estimated_weeks_min, estimated_weeks_max, status,
            notes, created_at, updated_at
     FROM quotes
     WHERE id = $1`,
    [quoteId]
  );
  return {
    lead: leadResult.rows[0],
    quote: quoteResult.rows[0],
  };
}

/**
 * Crea un lead y su cotización asociada dentro de una única transacción.
 *
 * Si cualquiera de las dos inserciones falla, se revierte todo para evitar
 * leads huérfanos (sin cotización) o cotizaciones sin lead.
 */
export async function createQuoteRequestWithDependencies(
  { requestId, requestHash, lead, quote },
  {
    databasePool = pool,
    createLead = leadsService.createLead,
    createQuote = quotesService.createQuote,
  } = {}
) {
  const client = await databasePool.connect();

  try {
    await client.query('BEGIN');

    const reservation = await reserveRequest(client, requestId, requestHash);
    if (reservation.lead_id !== null && reservation.quote_id !== null) {
      const completed = await loadCompletedRequest(
        client,
        reservation.lead_id,
        reservation.quote_id
      );
      await client.query('COMMIT');
      return completed;
    }

    const createdLead = await createLead(lead, client);

    const createdQuote = await createQuote(
      { ...quote, lead_id: createdLead.id },
      client
    );

    await client.query(
      `UPDATE quote_request_idempotency
       SET lead_id = $2, quote_id = $3, completed_at = NOW()
       WHERE request_id = $1`,
      [requestId, createdLead.id, createdQuote.id]
    );

    await client.query('COMMIT');

    return { lead: createdLead, quote: createdQuote };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function createQuoteRequest(payload) {
  return createQuoteRequestWithDependencies(payload);
}
