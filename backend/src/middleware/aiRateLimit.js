const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;
const MAX_TRACKED_CLIENTS = 10_000;

const clients = new Map();

function cleanExpiredEntries(now) {
  if (clients.size < MAX_TRACKED_CLIENTS) return;

  for (const [key, entry] of clients) {
    if (entry.resetAt <= now) clients.delete(key);
  }
}

export function aiRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip ?? req.socket?.remoteAddress ?? 'unknown';
  const current = clients.get(key);

  cleanExpiredEntries(now);

  if (!current || current.resetAt <= now) {
    clients.set(key, { count: 1, resetAt: now + WINDOW_MS });
    res.set('RateLimit-Limit', String(MAX_REQUESTS));
    res.set('RateLimit-Remaining', String(MAX_REQUESTS - 1));
    return next();
  }

  const remaining = Math.max(0, MAX_REQUESTS - current.count);
  res.set('RateLimit-Limit', String(MAX_REQUESTS));
  res.set('RateLimit-Remaining', String(remaining));

  if (current.count >= MAX_REQUESTS) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAt - now) / 1_000));
    res.set('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      success: false,
      error: 'Demasiadas solicitudes. Intenta nuevamente en un minuto.',
    });
  }

  current.count += 1;
  res.set('RateLimit-Remaining', String(MAX_REQUESTS - current.count));
  return next();
}

export function resetAiRateLimitForTests() {
  clients.clear();
}
