import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import proxyRoutes from './proxy.routes.js';
import oauthRoutes from './oauth.routes.js';

const router = Router();

// Mount routes - Order matters!
router.use('/', healthRoutes);      // /health
router.use('/', adminRoutes);       // /admin, /admin/api/*
router.use('/', authRoutes);        // /me, /platform/auth/*
router.use('/', oauthRoutes);       // /auth/google, /auth/github, /auth/facebook
router.use('/', proxyRoutes);       // /api/*

export default router;