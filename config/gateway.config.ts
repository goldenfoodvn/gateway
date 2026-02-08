// Gateway config (POC). Use env vars to override in production.
export const gatewayConfig = {
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  partnerEventUrl: process.env.PARTNER_EVENT_URL || 'http://localhost:4001/platform/events',
  databaseUrl: process.env.DATABASE_URL || '',
  logLevel: process.env.LOG_LEVEL || 'info',
};

export default gatewayConfig;
