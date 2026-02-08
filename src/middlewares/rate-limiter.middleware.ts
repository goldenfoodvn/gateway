import type { Request, Response, NextFunction } from 'express';

export function rateLimiter(options?: { windowMs?: number; maxRequests?: number }) {
  const windowMs = options?.windowMs ?? 60_000;
  const maxRequests = options?.maxRequests ?? 60;
  const counters = new Map<string, { count: number; resetAt: number }>();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.ip || req.connection.remoteAddress || 'unknown') as string;
    const now = Date.now();
    const entry = counters.get(ip);
    
    if (!entry || now > entry.resetAt) {
      counters.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }
    
    if (entry.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests' });
      return;
    }
    
    entry.count++;
    counters.set(ip, entry);
    next();
  };
}

export default rateLimiter;