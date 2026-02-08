import { Router } from 'express';
import type { Request, Response } from 'express';
import { authMiddleware, type AuthRequest } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ 
    ok: true, 
    user: req.user ?? null 
  });
});

router.post('/platform/auth/webhook', async (req: Request, res: Response) => {
  console.log('[webhook] Received:', req.body);
  res.json({ ok: true });
});

export default router;