import { Router, type Request, type Response } from 'express';
import RegistryService from '../services/registry.service.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * POST /admin/api/services
 * Register a new service
 * Body: { name: string, url: string }
 */
router.post('/admin/api/services', async (req: Request, res: Response) => {
  try {
    const { name, url } = req.body;

    // Validate input
    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Service name is required and must be a string'
      });
    }

    if (!url || typeof url !== 'string') {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Service URL is required and must be a string'
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Invalid URL format'
      });
    }

    // Register service
    await RegistryService.setService(name, url);

    res.status(201).json({
      success: true,
      message: 'Service registered successfully',
      service: { name, url }
    });
  } catch (error: any) {
    logger.error('Error registering service:', error);
    res.status(500).json({
      error: 'internal_error',
      message: error.message || 'Failed to register service'
    });
  }
});

/**
 * GET /admin/api/services
 * Get all registered services
 */
router.get('/admin/api/services', async (_req: Request, res: Response) => {
  try {
    const services = await RegistryService.getAllServices();

    res.json({
      success: true,
      count: Object.keys(services).length,
      services
    });
  } catch (error: any) {
    logger.error('Error getting services:', error);
    res.status(500).json({
      error: 'internal_error',
      message: error.message || 'Failed to retrieve services'
    });
  }
});

/**
 * DELETE /admin/api/services/:name
 * Remove a service from registry
 */
router.delete('/admin/api/services/:name', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;

    if (!name) {
      return res.status(400).json({
        error: 'invalid_request',
        message: 'Service name is required'
      });
    }

    // Check if service exists
    const url = await RegistryService.getService(name);
    if (!url) {
      return res.status(404).json({
        error: 'not_found',
        message: `Service '${name}' not found`
      });
    }

    // Remove service
    await RegistryService.removeService(name);

    res.json({
      success: true,
      message: 'Service removed successfully',
      service: { name, url }
    });
  } catch (error: any) {
    logger.error('Error removing service:', error);
    res.status(500).json({
      error: 'internal_error',
      message: error.message || 'Failed to remove service'
    });
  }
});

export default router;
