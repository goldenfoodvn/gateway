import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import proxyRoutes from './proxy.routes.js';

const router = Router();

// Mount routes - Order matters!
router.use('/', healthRoutes);      // /health
router.use('/', adminRoutes);       // /admin, /admin/api/*
router.use('/', authRoutes);        // /me, /platform/auth/*
router.use('/', proxyRoutes);       // /api/*

export default router;