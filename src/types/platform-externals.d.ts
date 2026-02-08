// Declaration stubs to satisfy TS in gateway project for imports from ../platform
// Add entries for each platform module you import from gateway.

// webhook handler (adjust if platform actually exports named instead of default)
declare module '../../platform/core/auth/webhook-handler.js' {
  import type { RequestHandler } from 'express';
  const idpWebhookHandler: RequestHandler;
  export default idpWebhookHandler;
}

// also accept import without .js extension (if some code imports that way)
declare module '../../platform/core/auth/webhook-handler' {
  import type { RequestHandler } from 'express';
  const idpWebhookHandler: RequestHandler;
  export default idpWebhookHandler;
}