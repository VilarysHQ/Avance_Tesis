import {
  ADMIN_SESSION_COOKIE,
  AdminAuthConfigurationError,
  adminCookieOptions,
  getAdminAuthConfig,
  issueAdminSession,
  revokeAdminSession,
  verifyAdminPassword,
} from '../services/adminAuth.service.js';

const GENERIC_LOGIN_ERROR = 'Correo o contraseña incorrectos.';

export async function loginAdmin(req, res, next) {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const config = getAdminAuthConfig();

    // La comparación costosa se ejecuta también si el correo no coincide para
    // mantener una respuesta uniforme y dificultar la enumeración de usuarios.
    const passwordMatches = await verifyAdminPassword(password, config.passwordHash);
    const emailMatches = email === config.email;
    if (!emailMatches || !passwordMatches) {
      return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    }

    const session = issueAdminSession({ email: config.email }, config);
    res.cookie(ADMIN_SESSION_COOKIE, session.token, adminCookieOptions(config));
    return res.json({
      success: true,
      user: { email: config.email, role: 'admin' },
      csrfToken: session.csrfToken,
      expiresAt: new Date(session.expiresAt).toISOString(),
    });
  } catch (error) {
    if (error instanceof AdminAuthConfigurationError) {
      return res.status(503).json({ error: 'El acceso administrativo no está disponible.' });
    }
    return next(error);
  }
}
export function getAdminSession(req, res) {
  return res.json({
    success: true,
    user: { email: req.adminSession.email, role: req.adminSession.role },
    csrfToken: req.adminSession.csrfToken,
    expiresAt: new Date(req.adminSession.expiresAt).toISOString(),
  });
}
export function logoutAdmin(req, res) {
  revokeAdminSession(req.adminSession.id);
  const options = adminCookieOptions(req.adminAuthConfig);
  delete options.maxAge;
  res.clearCookie(ADMIN_SESSION_COOKIE, options);
  return res.json({ success: true });
}
