-- Idempotencia persistente para POST /api/quote-requests.
-- No modifica filas comerciales existentes.

CREATE TABLE quote_request_idempotency (
  request_id   UUID PRIMARY KEY,
  request_hash VARCHAR(64) NOT NULL,
  lead_id      INTEGER REFERENCES leads (id) ON DELETE RESTRICT,
  quote_id     INTEGER UNIQUE REFERENCES quotes (id) ON DELETE RESTRICT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  CONSTRAINT quote_request_idempotency_hash_check CHECK (
    request_hash ~ '^[0-9a-f]{64}$'
  ),
  CONSTRAINT quote_request_idempotency_completion_check CHECK (
    (lead_id IS NULL AND quote_id IS NULL AND completed_at IS NULL)
    OR
    (lead_id IS NOT NULL AND quote_id IS NOT NULL AND completed_at IS NOT NULL)
  )
);

CREATE INDEX idx_quote_request_idempotency_created_at
  ON quote_request_idempotency (created_at);
