import {
  ADMIN_SESSION_COOKIE,
  AdminAuthConfigurationError,
  getAdminAuthConfig,
  readAdminSession,
  verifyCsrfToken,
} from '../services/adminAuth.service.js';
import { getAllowedOrigins, isAllowedOrigin } from '../config/httpSecurity.js';

function parseCookies(header) {
  if (typeof header !== 'string') return {};
  return Object.fromEntries(
    header.split(';').map((part) => {
      const separator = part.indexOf('=');
      if (separator < 0) return [part.trim(), ''];
      const key = part.slice(0, separator).trim();
      const raw = part.slice(separator + 1).trim();
      try {
        return [key, decodeURIComponent(raw)];
      } catch {
        return [key, ''];
      }
    })
  );
}
function authUnavailable(res) {
  return res.status(503).json({ error: 'El acceso administrativo no está disponible.' });
}
export function authenticateAdmin(req, res, next) {
  try {
    const config = getAdminAuthConfig();
    const token = parseCookies(req.headers?.cookie)[ADMIN_SESSION_COOKIE];
    const session = readAdminSession(token, config);
    if (!session) {
      return res.status(401).json({ error: 'Autenticación administrativa requerida.' });
    }
    req.adminSession = session;
    req.adminAuthConfig = config;
    return next();
  } catch (error) {
    if (error instanceof AdminAuthConfigurationError) return authUnavailable(res);
    return next(error);
  }
}

export function requireAdminRole(req, res, next) {
  if (req.adminSession?.role !== 'admin') {
    return res.status(403).json({ error: 'No tienes permisos para realizar esta acción.' });
  }
  return next();
}
export function requireCsrf(req, res, next) {
  const token = req.get?.('X-CSRF-Token') ?? req.headers?.['x-csrf-token'];
  if (!verifyCsrfToken(req.adminSession, token)) {
    return res.status(403).json({ error: 'La validación de seguridad de la solicitud falló.' });
  }
  return next();
}

export function requireTrustedOrigin(req, res, next) {
  const origin = req.get?.('Origin') ?? req.headers?.origin;
  if (!isAllowedOrigin(origin, getAllowedOrigins())) {
    return res.status(403).json({ error: 'Origen de solicitud no permitido.' });
  }
  return next();
}
