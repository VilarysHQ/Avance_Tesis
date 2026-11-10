function clientKey(req) {
  return req.ip ?? req.socket?.remoteAddress ?? 'unknown';
}

export function createMemoryRateLimit({
  windowMs,
  maxRequests,
  message = 'Demasiadas solicitudes. Intenta nuevamente más tarde.',
  maxTrackedClients = 10_000,
  keyGenerator = clientKey,
}) {
  const clients = new Map();

  function cleanup(now) {
    for (const [key, entry] of clients) {
      if (entry.resetAt <= now) clients.delete(key);
    }
    while (clients.size >= maxTrackedClients) {
      clients.delete(clients.keys().next().value);
    }
  }

  function rateLimit(req, res, next) {
    const now = Date.now();
    cleanup(now);

    const key = keyGenerator(req);
    const current = clients.get(key);
    const entry = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    res.set('RateLimit-Limit', String(maxRequests));

    if (entry.count >= maxRequests) {
      const retryAfterSeconds = Math.max(1, Math.ceil((entry.resetAt - now) / 1_000));
      res.set('RateLimit-Remaining', '0');
      res.set('Retry-After', String(retryAfterSeconds));
      clients.set(key, entry);
      return res.status(429).json({ success: false, error: message });
    }

    entry.count += 1;
    clients.set(key, entry);
    res.set('RateLimit-Remaining', String(maxRequests - entry.count));
    return next();
  }

  rateLimit.reset = () => clients.clear();
  return rateLimit;
}

export const loginRateLimit = createMemoryRateLimit({
  windowMs: 15 * 60_000,
  maxRequests: 5,
  message: 'Demasiados intentos de acceso. Intenta nuevamente más tarde.',
});
export const quoteRequestRateLimit = createMemoryRateLimit({
  windowMs: 15 * 60_000,
  maxRequests: 10,
  message: 'Demasiadas solicitudes de cotización. Intenta nuevamente más tarde.',
});
