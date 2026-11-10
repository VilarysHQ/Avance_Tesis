import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DatabaseConfigurationError,
  getDatabasePoolConfig,
} from '../src/config/databaseConfig.js';

const LOCAL_URL = 'postgresql://user:password@localhost:5432/predict_sale';
const PRODUCTION_URL =
  'postgresql://user:password@pooler.supabase.com:5432/postgres' +
  '?sslmode=verify-full&sslrootcert=%2Fetc%2Fsecrets%2Fprod-supabase.crt';

test('usa límites seguros por defecto en desarrollo', () => {
  const config = getDatabasePoolConfig({ DATABASE_URL: LOCAL_URL });

  assert.equal(config.connectionString, LOCAL_URL);
  assert.equal(config.max, 10);
  assert.equal(config.connectionTimeoutMillis, 10_000);
  assert.equal(config.idleTimeoutMillis, 30_000);
});

test('limita el pool de producción y exige TLS con certificado', () => {
  const config = getDatabasePoolConfig(
    { DATABASE_URL: PRODUCTION_URL, NODE_ENV: 'production' },
    { fileExists: (path) => path === '/etc/secrets/prod-supabase.crt' }
  );

  assert.equal(config.max, 5);
});

test('permite configurar un tamaño de pool acotado', () => {
  const config = getDatabasePoolConfig({
    DATABASE_URL: LOCAL_URL,
    DB_POOL_MAX: '4',
  });

  assert.equal(config.max, 4);
});

test('rechaza tamaños de pool inválidos sin exponer DATABASE_URL', () => {
  assert.throws(
    () => getDatabasePoolConfig({ DATABASE_URL: LOCAL_URL, DB_POOL_MAX: '100' }),
    (error) => {
      assert.ok(error instanceof DatabaseConfigurationError);
      assert.equal(error.code, 'DATABASE_CONFIGURATION_ERROR');
      assert.doesNotMatch(error.message, /password/);
      return true;
    }
  );
});

test('rechaza producción sin verify-full', () => {
  assert.throws(
    () =>
      getDatabasePoolConfig({
        DATABASE_URL: 'postgresql://user:secret@pooler.supabase.com:5432/postgres',
        NODE_ENV: 'production',
      }),
    /sslmode=verify-full/
  );
});

test('rechaza producción cuando el certificado no está disponible', () => {
  assert.throws(
    () =>
      getDatabasePoolConfig(
        { DATABASE_URL: PRODUCTION_URL, NODE_ENV: 'production' },
        { fileExists: () => false }
      ),
    /certificado raíz/
  );
});
