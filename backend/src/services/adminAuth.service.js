import {
  createHmac,
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback);
const HASH_PREFIX = 'scrypt';
// Configuración mínima equivalente recomendada por OWASP: N=2^15, r=8, p=3.
// Prioriza un uso de memoria moderado para una instancia académica de Render.
const SCRYPT_N = 32_768;
const SCRYPT_R = 8;
const SCRYPT_P = 3;
const HASH_LENGTH = 64;
const DEFAULT_TTL_MINUTES = 30;
const MAX_SESSIONS = 100;

export const ADMIN_SESSION_COOKIE = 'admin_session';

export class AdminAuthConfigurationError extends Error {
  constructor() {
    super('La autenticación administrativa no está configurada.');
    this.name = 'AdminAuthConfigurationError';
    this.code = 'ADMIN_AUTH_NOT_CONFIGURED';
  }
}
function decode(value) {
  try {
    return Buffer.from(value, 'base64url');
  } catch {
    return null;
  }
}
function parsePasswordHash(encoded) {
  if (typeof encoded !== 'string') return null;
  const [prefix, n, r, p, saltValue, hashValue] = encoded.split('$');
  const salt = decode(saltValue);
  const hash = decode(hashValue);
  if (
    prefix !== HASH_PREFIX ||
    Number(n) !== SCRYPT_N ||
    Number(r) !== SCRYPT_R ||
    Number(p) !== SCRYPT_P ||
    !salt || salt.length < 16 ||
    !hash || hash.length !== HASH_LENGTH
  ) {
    return null;
  }
  return { salt, hash };
}

export async function hashAdminPassword(password, salt = randomBytes(16)) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) {
    throw new TypeError('La contraseña debe tener entre 12 y 256 caracteres.');
  }
  const hash = await scrypt(password, salt, HASH_LENGTH, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return [
    HASH_PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    salt.toString('base64url'),
    Buffer.from(hash).toString('base64url'),
  ].join('$');
}

export async function verifyAdminPassword(password, encodedHash) {
  const parsed = parsePasswordHash(encodedHash);
  if (!parsed || typeof password !== 'string' || password.length > 256) return false;
  const candidate = await scrypt(password, parsed.salt, parsed.hash.length, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return timingSafeEqual(Buffer.from(candidate), parsed.hash);
}

export function getAdminAuthConfig(env = process.env) {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const passwordHash = env.ADMIN_PASSWORD_HASH?.trim();
  const sessionSecret = env.ADMIN_SESSION_SECRET?.trim();
  const requestedTtl = Number(env.ADMIN_SESSION_TTL_MINUTES ?? DEFAULT_TTL_MINUTES);
  const ttlMinutes = Number.isInteger(requestedTtl) && requestedTtl >= 5 && requestedTtl <= 480
    ? requestedTtl
    : DEFAULT_TTL_MINUTES;

  if (
    !email ||
    !email.includes('@') ||
    !parsePasswordHash(passwordHash) ||
    !sessionSecret ||
    sessionSecret.length < 32
  ) {
    throw new AdminAuthConfigurationError();
  }

  return {
    email,
    passwordHash,
    sessionSecret,
    ttlMs: ttlMinutes * 60_000,
    isProduction: env.NODE_ENV === 'production',
  };
}

function safeEqualText(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string') return false;
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function signature(id, secret) {
  return createHmac('sha256', secret).update(id).digest('base64url');
}

const sessions = new Map();

function cleanSessions(now) {
  for (const [id, session] of sessions) {
    if (session.expiresAt <= now) sessions.delete(id);
  }
  while (sessions.size >= MAX_SESSIONS) sessions.delete(sessions.keys().next().value);
}

export function issueAdminSession(
  { email, role = 'admin' },
  config,
  now = Date.now()
) {
  cleanSessions(now);
  const id = randomBytes(32).toString('base64url');
  const csrfToken = randomBytes(32).toString('base64url');
  const expiresAt = now + config.ttlMs;
  sessions.set(id, { email, role, csrfToken, expiresAt });
  return {
    token: `${id}.${signature(id, config.sessionSecret)}`,
    csrfToken,
    expiresAt,
  };
}

export function readAdminSession(token, config, now = Date.now()) {
  if (typeof token !== 'string') return null;
  const separator = token.lastIndexOf('.');
  if (separator <= 0) return null;
  const id = token.slice(0, separator);
  const suppliedSignature = token.slice(separator + 1);
  if (!safeEqualText(suppliedSignature, signature(id, config.sessionSecret))) return null;
  const session = sessions.get(id);
  if (!session) return null;
  if (session.expiresAt <= now) {
    sessions.delete(id);
    return null;
  }
  return { id, ...session };
}

export function revokeAdminSession(sessionId) {
  if (sessionId) sessions.delete(sessionId);
}

export function verifyCsrfToken(session, token) {
  return Boolean(session && safeEqualText(session.csrfToken, token));
}

export function adminCookieOptions(config) {
  return {
    httpOnly: true,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    path: '/api',
    maxAge: config.ttlMs,
  };
}

export function resetAdminSessionsForTests() {
  sessions.clear();
}
