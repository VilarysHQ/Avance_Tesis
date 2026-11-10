const DEFAULT_DEVELOPMENT_ORIGIN = 'http://localhost:5173';

export function getAllowedOrigins(value = process.env.CORS_ORIGIN) {
  const source = value?.trim() || DEFAULT_DEVELOPMENT_ORIGIN;
  return source
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
export function isAllowedOrigin(origin, allowedOrigins = getAllowedOrigins()) {
  return typeof origin === 'string' && allowedOrigins.includes(origin);
}
export function createCorsOriginValidator(allowedOrigins = getAllowedOrigins()) {
  return (origin, callback) => {
    // Herramientas servidor-a-servidor no envían Origin. La autorización de
    // rutas administrativas se valida independientemente de CORS.
    if (!origin || isAllowedOrigin(origin, allowedOrigins)) {
      callback(null, true);
      return;
    }

    const error = new Error('Origin no permitido.');
    error.code = 'CORS_NOT_ALLOWED';
    callback(error);
  };
}
