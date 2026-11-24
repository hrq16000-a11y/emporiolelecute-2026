/** Best-effort per-worker protection, not a distributed/global quota. No tokens retained. */
export const createTrackingLimiter = (limit = 20, windowMs = 60_000, capacity = 5000) => {
  const attempts = new Map<string, { count: number; expiresAt: number }>();
  return (client: string, now = Date.now()): number => {
    for (const [key, bucket] of attempts) {
      if (bucket.expiresAt <= now) attempts.delete(key);
    }
    const bucket = attempts.get(client);
    if (bucket) {
      if (bucket.count >= limit) return Math.max(1, Math.ceil((bucket.expiresAt - now) / 1000));
      bucket.count += 1;
      return 0;
    }
    // Fail closed at capacity instead of evicting active limits.
    if (attempts.size >= capacity) return Math.ceil(windowMs / 1000);
    attempts.set(client, { count: 1, expiresAt: now + windowMs });
    return 0;
  };
};

export const trackingClient = (req: Request): string =>
  req.headers.get('x-forwarded-for')?.split(',').at(-1)?.trim().slice(0, 64) || 'unknown';