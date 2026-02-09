# Testing JWT Authentication System

## Prerequisites

Make sure you have:
1. Redis running locally or configure REDIS_HOST in .env
2. JWT secrets configured in .env

## 1. Login

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: web-123" \
  -H "X-Device-Name: Chrome Browser" \
  -d '{
    "email": "user@example.com",
    "userId": "user_123",
    "roles": ["user"]
  }'
```

Expected response:
```json
{
  "ok": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

## 2. Access Protected Endpoint

```bash
curl http://localhost:3000/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:
```json
{
  "ok": true,
  "user": {
    "userId": "user_123",
    "email": "user@example.com",
    "roles": ["user"],
    "sessionId": "...",
    "deviceId": "web-123",
    "iat": 1234567890,
    "exp": 1234568790
  }
}
```

## 3. Refresh Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

Expected response:
```json
{
  "ok": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "expiresIn": 900,
    "tokenType": "Bearer"
  }
}
```

## 4. Get Sessions

```bash
curl http://localhost:3000/auth/sessions \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:
```json
{
  "ok": true,
  "data": {
    "sessions": [
      {
        "sessionId": "...",
        "deviceId": "web-123",
        "deviceName": "Chrome Browser",
        "deviceType": "web",
        "ipAddress": "::1",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "lastActivity": "2024-01-01T00:00:00.000Z",
        "current": true
      }
    ]
  }
}
```

## 5. Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:
```json
{
  "ok": true,
  "message": "Logged out successfully"
}
```

## 6. Logout All Devices

```bash
curl -X POST http://localhost:3000/auth/logout-all \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:
```json
{
  "ok": true,
  "message": "Logged out from all devices"
}
```

## 7. Delete Specific Session

```bash
curl -X DELETE http://localhost:3000/auth/sessions/SESSION_ID \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

Expected response:
```json
{
  "ok": true,
  "message": "Session deleted"
}
```

## Testing Flow

1. **Login** to get access and refresh tokens
2. **Use access token** to access protected endpoints like `/me`
3. **Refresh token** when access token expires
4. **Check sessions** to see all active devices
5. **Logout** to invalidate current session
6. Try to use the **revoked token** - should get 401 error
7. **Login again** from a different device (change X-Device-Id)
8. **Check sessions** - should see multiple sessions
9. **Logout all devices** to clear all sessions

## Testing Token Blacklist

```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","userId":"test_123"}' \
  | jq -r '.data.accessToken')

# 2. Use token (should work)
curl http://localhost:3000/me -H "Authorization: Bearer $TOKEN"

# 3. Logout (blacklist token)
curl -X POST http://localhost:3000/auth/logout -H "Authorization: Bearer $TOKEN"

# 4. Try to use same token (should fail with 401)
curl http://localhost:3000/me -H "Authorization: Bearer $TOKEN"
```

## Testing Multi-Device Sessions

```bash
# Login from Device 1
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: device-1" \
  -H "X-Device-Name: iPhone" \
  -H "X-Device-Type: mobile" \
  -d '{"email":"user@example.com","userId":"user_123"}'

# Login from Device 2
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -H "X-Device-Id: device-2" \
  -H "X-Device-Name: Chrome" \
  -H "X-Device-Type: web" \
  -d '{"email":"user@example.com","userId":"user_123"}'

# Check sessions (should see both devices)
curl http://localhost:3000/auth/sessions -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Error Cases to Test

1. **Missing credentials**: Login without email or userId
2. **Invalid refresh token**: Use wrong/expired refresh token
3. **Blacklisted token**: Use token after logout
4. **Expired access token**: Wait 15 minutes or modify JWT_ACCESS_SECRET
5. **Invalid session**: Delete session in Redis manually
6. **Delete other user's session**: Try to delete session that doesn't belong to you

## Environment Variables

Add to your `.env` file:
```
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

JWT_ACCESS_SECRET=your-super-secret-access-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
```
