import { existsSync } from 'node:fs';

const DEVELOPMENT_POOL_MAX = 10;
const PRODUCTION_POOL_MAX = 5;
const MIN_POOL_MAX = 1;
const MAX_POOL_MAX = 20;

export class DatabaseConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DatabaseConfigurationError';
    this.code = 'DATABASE_CONFIGURATION_ERROR';
  }
}

function parsePoolMax(value, defaultValue) {
  if (value === undefined || value === null || value === '') return defaultValue;

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < MIN_POOL_MAX || parsed > MAX_POOL_MAX) {
    throw new DatabaseConfigurationError(
      `DB_POOL_MAX debe ser un entero entre ${MIN_POOL_MAX} y ${MAX_POOL_MAX}.`
    );
  }
  return parsed;
}

function validateProductionTls(connectionString, fileExists) {
  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new DatabaseConfigurationError('DATABASE_URL no es una URL PostgreSQL válida.');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new DatabaseConfigurationError('DATABASE_URL debe utilizar PostgreSQL.');
  }

  if (url.searchParams.get('sslmode') !== 'verify-full') {
    throw new DatabaseConfigurationError(
      'DATABASE_URL debe utilizar sslmode=verify-full en producción.'
    );
  }

  const rootCertificate = url.searchParams.get('sslrootcert');
  if (!rootCertificate || !fileExists(rootCertificate)) {
    throw new DatabaseConfigurationError(
      'El certificado raíz configurado para PostgreSQL no está disponible.'
    );
  }
}

export function getDatabasePoolConfig(
  env = process.env,
  { fileExists = existsSync } = {}
) {
  const connectionString = env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new DatabaseConfigurationError(
      'DATABASE_URL no está definida. Copia .env.example a .env y configúrala.'
    );
  }

  const isProduction = env.NODE_ENV === 'production';
  if (isProduction) validateProductionTls(connectionString, fileExists);

  return {
    connectionString,
    max: parsePoolMax(
      env.DB_POOL_MAX,
      isProduction ? PRODUCTION_POOL_MAX : DEVELOPMENT_POOL_MAX
    ),
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  };
}
