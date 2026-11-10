const POSTGRES_UNIQUE_VIOLATION = '23505';
const POSTGRES_FOREIGN_KEY_VIOLATION = '23503';
const POSTGRES_CHECK_VIOLATION = '23514';
const POSTGRES_INVALID_TEXT_REPRESENTATION = '22P02';

export function errorHandler(error, req, res, next) {
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'El cuerpo JSON no es válido.',
    });
  }

  if (error?.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'El cuerpo de la solicitud es demasiado grande.',
    });
  }

  console.error('[error]', {
    name: error?.name ?? 'Error',
    code: typeof error?.code === 'string' ? error.code : null,
  });

  if (error?.code === 'CORS_NOT_ALLOWED') {
    return res.status(403).json({ error: 'Origen no permitido.' });
  }

  if (error.code === POSTGRES_UNIQUE_VIOLATION) {
    return res.status(409).json({
      error: 'El registro ya existe (valor duplicado).',
    });
  }

  if (error.code === POSTGRES_FOREIGN_KEY_VIOLATION) {
    return res.status(400).json({
      error: 'Referencia inválida a un registro relacionado.',
    });
  }

  if (error.code === POSTGRES_CHECK_VIOLATION) {
    return res.status(400).json({
      error: 'Los datos no cumplen una restricción de la base de datos.',
    });
  }

  if (error.code === POSTGRES_INVALID_TEXT_REPRESENTATION) {
    return res.status(400).json({
      error: 'Formato de dato inválido.',
    });
  }

  return res.status(500).json({
    error: 'Error interno del servidor.',
  });
}
