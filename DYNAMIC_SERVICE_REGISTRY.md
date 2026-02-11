# Dynamic Service Registry Implementation

## Overview

This document describes the implementation of Phase 2 - Target 1: Service Discovery (Dynamic Service Registry) using Redis for the Gateway application.

## Architecture

The dynamic service registry replaces the static configuration in `src/config/services.ts` with a Redis-based dynamic registry that allows services to be registered, updated, and removed at runtime without requiring gateway restarts.

### Components

#### 1. Registry Service (`src/services/registry.service.ts`)

The core service that manages service registration in Redis:

- **Storage**: Uses Redis Hash at key `gateway:services`
- **Cache**: Implements 10-second in-memory cache to reduce Redis load
- **Fallback**: Returns cached values when Redis is unavailable

**Methods:**
- `setService(name: string, url: string)` - Register/update a service
- `getService(name: string)` - Get service URL
- `removeService(name: string)` - Remove a service
- `getAllServices()` - Get all registered services
- `clearCache()` - Clear in-memory cache

#### 2. Admin API (`src/routes/registry.routes.ts`)

RESTful API endpoints for managing service registry:

- `POST /admin/api/services` - Register a new service
  ```json
  {
    "name": "user-service",
    "url": "http://localhost:3001"
  }
  ```

- `GET /admin/api/services` - List all registered services
  ```json
  {
    "success": true,
    "count": 3,
    "services": {
      "user": "http://localhost:3001",
      "product": "http://localhost:3002"
    }
  }
  ```

- `DELETE /admin/api/services/:name` - Remove a service

#### 3. Dynamic Proxy Routes (`src/routes/proxy.routes.ts`)

Completely refactored to support dynamic routing:

- **Route Pattern**: `/api/:serviceName/*`
- **Service Lookup**: Uses `RegistryService.getService()` to resolve service URLs dynamically
- **Circuit Breaker**: Maintains circuit breaker functionality per service
- **Error Handling**: Returns 404 for unregistered services

## Usage

### 1. Register a Service

```bash
curl -X POST http://localhost:3000/admin/api/services \
  -H "Content-Type: application/json" \
  -d '{
    "name": "user",
    "url": "http://localhost:3001"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Service registered successfully",
  "service": {
    "name": "user",
    "url": "http://localhost:3001"
  }
}
```

### 2. List All Services

```bash
curl http://localhost:3000/admin/api/services
```

### 3. Remove a Service

```bash
curl -X DELETE http://localhost:3000/admin/api/services/user
```

### 4. Route Requests to Services

Once registered, requests are automatically routed:

```bash
# Routes to the 'user' service at http://localhost:3001/profile
curl http://localhost:3000/api/user/profile

# Routes to the 'product' service at http://localhost:3002/items
curl http://localhost:3000/api/product/items
```

## Configuration

### Redis Settings

Configure Redis in your `.env` file:

```env
# Enable/disable Redis
REDIS_ENABLED=true

# Option 1: Use REDIS_URL (recommended)
REDIS_URL=redis://localhost:6379

# Option 2: Use individual parameters
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Without Redis

If Redis is disabled (`REDIS_ENABLED=false`), the registry API will return errors, but the gateway will continue to function with cached values or fallback to error responses.

## Features

### 1. In-Memory Caching
- Reduces Redis load by caching service URLs for 10 seconds
- Automatically invalidates cache on updates
- Uses cached values as fallback when Redis is unavailable

### 2. Circuit Breaker Integration
- Maintains per-service circuit breakers
- Prevents cascading failures
- Automatically tracks service health

### 3. Error Handling
- Graceful degradation when Redis is unavailable
- Clear error messages for unregistered services
- Proper HTTP status codes

### 4. TypeScript Strict Mode
- Full type safety
- Comprehensive error handling
- Clear interfaces and contracts

## Migration from Static Configuration

The old static configuration in `src/config/services.ts` is marked as **deprecated**. To migrate:

1. Start Redis server
2. Use the Admin API to register your services
3. Verify services are registered: `GET /admin/api/services`
4. Test your application
5. (Optional) Remove references to static configuration

## API Examples

### Register Multiple Services

```bash
# Register user service
curl -X POST http://localhost:3000/admin/api/services \
  -H "Content-Type: application/json" \
  -d '{"name": "user", "url": "http://user-service:3001"}'

# Register product service
curl -X POST http://localhost:3000/admin/api/services \
  -H "Content-Type: application/json" \
  -d '{"name": "product", "url": "http://product-service:3002"}'

# Register order service
curl -X POST http://localhost:3000/admin/api/services \
  -H "Content-Type: application/json" \
  -d '{"name": "order", "url": "http://order-service:3003"}'
```

### Update a Service URL

```bash
# Same as registration - updates existing service
curl -X POST http://localhost:3000/admin/api/services \
  -H "Content-Type: application/json" \
  -d '{"name": "user", "url": "http://new-user-service:4001"}'
```

## Error Responses

### Service Not Found
```json
{
  "error": "service_not_found",
  "message": "Service 'unknown' is not registered",
  "service": "unknown"
}
```

### Redis Unavailable
```json
{
  "error": "internal_error",
  "message": "Redis is not available"
}
```

### Invalid Request
```json
{
  "error": "invalid_request",
  "message": "Service name is required and must be a string"
}
```

## Performance Considerations

1. **Cache TTL**: 10 seconds by default, configurable in `RegistryService.CACHE_TTL_MS`
2. **Redis Connection**: Connection pooling handled by Redis client
3. **Fallback Strategy**: Uses cached values when Redis is temporarily unavailable
4. **Circuit Breaker**: Prevents overwhelming failing services

## Security Considerations

> **Note**: The current implementation does not include authentication/authorization for the admin API endpoints. In production, you should:
> 1. Add authentication middleware to `/admin/api/*` endpoints
> 2. Implement role-based access control (RBAC)
> 3. Add rate limiting for admin endpoints
> 4. Validate and sanitize service URLs
> 5. Use HTTPS in production

## Testing

### Manual Testing

1. Start Redis:
   ```bash
   redis-server
   ```

2. Start the gateway:
   ```bash
   npm run dev
   ```

3. Register a test service:
   ```bash
   curl -X POST http://localhost:3000/admin/api/services \
     -H "Content-Type: application/json" \
     -d '{"name": "test", "url": "http://localhost:5000"}'
   ```

4. Test routing:
   ```bash
   curl http://localhost:3000/api/test/health
   ```

### Health Check

The service includes health check endpoints:

```bash
# Gateway health
curl http://localhost:3000/health

# Admin stats (includes Redis status)
curl http://localhost:3000/admin/api/stats
```

## Troubleshooting

### Issue: "Service not found" errors

**Solution**: Check if the service is registered:
```bash
curl http://localhost:3000/admin/api/services
```

### Issue: "Redis is not available" errors

**Solutions**:
1. Check Redis is running: `redis-cli ping`
2. Verify Redis configuration in `.env`
3. Check Redis logs for connection errors
4. Temporarily use cached values (will be stale after 10 seconds)

### Issue: Circuit breaker is OPEN

**Solution**: Wait for the reset timeout (default: 30 seconds) or fix the downstream service and wait for the circuit breaker to half-open and test the connection.

## Future Enhancements

Potential improvements for future versions:

1. **Health checks**: Automatic health checking of registered services
2. **Service Versioning**: Support for multiple versions of the same service
3. **Load Balancing**: Multiple instances per service with load balancing
4. **Service Discovery**: Integration with service mesh or service discovery platforms
5. **Metrics**: Service-level metrics and monitoring
6. **Admin UI**: Web interface for managing services
7. **Authentication**: Secure admin API endpoints
8. **Webhooks**: Notifications when services are registered/removed

## Related Files

- `src/services/registry.service.ts` - Core registry service
- `src/routes/registry.routes.ts` - Admin API endpoints
- `src/routes/proxy.routes.ts` - Dynamic proxy routing
- `src/routes/admin.routes.ts` - Admin routes integration
- `src/config/redis.ts` - Redis connection manager
- `src/config/services.ts` - **DEPRECATED** Static configuration

## Support

For issues or questions, please refer to:
- Project README: `README.md`
- Implementation summary: `IMPLEMENTATION_SUMMARY.md`
- Testing documentation: `TESTING.md`
