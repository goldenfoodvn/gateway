import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
// import proxyRoutes from './proxy.routes.js';  // ← Tạm comment

const router = Router();

router.use('/', healthRoutes);
router.use('/', authRoutes);
// router.use('/', proxyRoutes);  // ← Tạm comment

export default router;