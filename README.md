# 🚀 Sapalens API Gateway

Enterprise-grade API Gateway for Sapalens microservices platform built with Express.js and TypeScript.

## 📋 Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Gateway](#running-the-gateway)
- [API Endpoints](#api-endpoints)
- [Project Structure](#project-structure)
- [Docker](#docker)
- [Development](#development)

---

## ✨ Features

- ✅ **Request Routing** - Intelligent routing to microservices
- ✅ **Authentication** - JWT token verification with JWKS
- ✅ **Rate Limiting** - IP-based request throttling
- ✅ **CORS** - Configurable cross-origin resource sharing
- ✅ **Logging** - Winston-based structured logging
- ✅ **Error Handling** - Centralized error management
- ✅ **Health Checks** - Service availability monitoring
- ✅ **Static Files** - Serve frontend applications
- ✅ **Auto Port Management** - Automatic port cleanup on startup
- ✅ **Graceful Shutdown** - Safe service termination

---

## 🏗️ Architecture

```
┌──────────────┐
│   Clients    │
│ (Web/Mobile) │
└──────┬───────┘
       │
       ▼
┌─────────────────────────────┐
│    API Gateway (Port 3000)  │
│  ┌─────────────────────┐    │
│  │  Authentication     │    │
│  │  Rate Limiting      │    │
│  │  CORS               │    │
│  │  Logging            │    │
│  └─────────────────────┘    │
└──────┬──────────────────────┘
       │
       ├──────────┬──────────┬──────────┐
       ▼          ▼          ▼          ▼
  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
  │  User  │ │Product │ │ Order  │ │Payment │
  │Service │ │Service │ │Service │ │Service │
  │ :3001  │ │ :3002  │ │ :3003  │ │ :3004  │
  └────────┘ └────────┘ └────────┘ └────────┘
```

---

## 📦 Installation

### Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

### Install Dependencies

```bash
npm install
```

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Server
NODE_ENV=development
PORT=3000

# Authentication (Optional)
AUTH_JWKS_URI=https://your-auth-provider.com/.well-known/jwks.json
AUTH_AUDIENCE=your-api-audience
AUTH_ISSUER=https://your-auth-provider.com/

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# Logging
LOG_LEVEL=info

# Microservices URLs
USER_SERVICE_URL=http://localhost:3001
PRODUCT_SERVICE_URL=http://localhost:3002
ORDER_SERVICE_URL=http://localhost:3003
PAYMENT_SERVICE_URL=http://localhost:3004

# Platform
PARTNER_EVENT_URL=http://localhost:4001/platform/events
DATABASE_URL=postgresql://user:password@localhost:5432/sapalens
```

---

## 🏃 Running the Gateway

### Development Mode (with auto-reload)

```bash
npm run dev
```

Server will start on `http://localhost:3000`

### Build for Production

```bash
npm run build
```

### Start Production Server

```bash
npm start
```

### TypeScript & ESM Notes

This project uses:
- **ES Modules (ESM)**: `package.json` has `"type": "module"` for modern JavaScript module support
- **NodeNext Module Resolution**: TypeScript is configured with `"module": "NodeNext"` and `"moduleResolution": "NodeNext"` for optimal ESM compatibility
- **`.js` Import Extensions**: Import statements use `.js` extensions (e.g., `import config from './config/index.js'`) as required by ESM, while TypeScript automatically resolves the corresponding `.ts` source files
- **Strict Type Checking**: The project uses TypeScript's `strict` mode to catch type errors at compile time

When adding new files, remember to:
1. Use `.js` extensions in import statements
2. Ensure proper named/default exports in index files
3. TypeScript will handle type resolution from `.ts` files at compile time
4. Run `npm run type-check` before committing to ensure no type errors
5. Ensure all function parameters and return types are explicitly typed

---

## 📡 API Endpoints

### Health Check

**GET** `/health`

Returns gateway status and uptime.

```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1707389234567,
  "uptime": 123.456
}
```

---

### Get Current User (Protected)

**GET** `/me`

**Headers:** `Authorization: Bearer <JWT_TOKEN>`

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/me
```

**Response:**
```json
{
  "ok": true,
  "user": {
    "sub": "user_id",
    "email": "user@example.com"
  }
}
```

---

### Platform Auth Webhook

**POST** `/platform/auth/webhook`

**Headers:** `Content-Type: application/json`

```bash
curl -X POST http://localhost:3000/platform/auth/webhook \
  -H "Content-Type: application/json" \
  -d '{"event":"user.created","userId":"123"}'
```

**Response:**
```json
{
  "ok": true
}
```

---

## 📁 Project Structure

```
gateway/
├── src/
│   ├── config/
│   │   ├── index.ts              # Centralized configuration
│   │   └── services.ts           # Service registry
│   ├── middlewares/
│   │   ├── auth.middleware.ts    # JWT authentication
│   │   ├── cors.middleware.ts    # CORS configuration
│   │   ├── error.middleware.ts   # Error handling
│   │   ├── logger.middleware.ts  # Request logging
│   │   ├── rate-limiter.middleware.ts # Rate limiting
│   │   └── index.ts              # Middleware exports
│   ├── routes/
│   │   ├── auth.routes.ts        # Auth endpoints
│   │   ├── health.routes.ts      # Health check
│   │   └── index.ts              # Route aggregator
│   ├── utils/
│   │   └── logger.ts             # Winston logger
│   ├── types/
│   │   └── platform-externals.d.ts
│   └── router.ts                 # Main entry point
├── scripts/
│   └── kill-port.js              # Port cleanup utility
├── public/                       # Static files
├── .env.example                  # Environment template
├── .gitignore
├── package.json
├── tsconfig.json
├── Dockerfile
└── README.md
```

---

## 🔐 OAuth Setup

The gateway supports OAuth login with Google, GitHub, and Facebook. Each provider can be enabled/disabled independently.

### How OAuth Works

1. User clicks login button (e.g., "Login with Google")
2. User is redirected to the OAuth provider for authorization
3. After authorization, provider redirects back to `/auth/{provider}/callback`
4. Gateway generates JWT tokens and stores them in the browser's localStorage
5. User is redirected back to the homepage, now logged in

### Setting Up OAuth Providers

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API**
4. Navigate to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Configure the OAuth consent screen
6. Add authorized redirect URI: `http://localhost:3000/auth/google/callback`
7. Copy the **Client ID** and **Client Secret** to your `.env`:

```env
GOOGLE_CLIENT_ID=your-client-id-here
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback
```

#### GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **New OAuth App**
3. Fill in the application details:
   - **Application name**: Your app name
   - **Homepage URL**: `http://localhost:3000`
   - **Authorization callback URL**: `http://localhost:3000/auth/github/callback`
4. Copy the **Client ID** and generate a **Client Secret**
5. Add to your `.env`:

```env
GITHUB_CLIENT_ID=your-client-id-here
GITHUB_CLIENT_SECRET=your-client-secret-here
GITHUB_CALLBACK_URL=http://localhost:3000/auth/github/callback
```

#### Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com/)
2. Create a new app or select an existing one
3. Add **Facebook Login** product
4. In Facebook Login settings, add valid OAuth redirect URI:
   - `http://localhost:3000/auth/facebook/callback`
5. Copy the **App ID** and **App Secret** to your `.env`:

```env
FACEBOOK_APP_ID=your-app-id-here
FACEBOOK_APP_SECRET=your-app-secret-here
FACEBOOK_CALLBACK_URL=http://localhost:3000/auth/facebook/callback
```

### Disabling OAuth Providers

To disable a provider, simply leave its credentials empty in `.env`:

```env
# Facebook disabled - leave empty
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
```

When disabled, users will see a friendly error message if they try to use that provider.

### OAuth Endpoints

- **Google**: `GET /auth/google` → `GET /auth/google/callback`
- **GitHub**: `GET /auth/github` → `GET /auth/github/callback`
- **Facebook**: `GET /auth/facebook` → `GET /auth/facebook/callback`
- **Callback Page**: `GET /auth/callback` - Displays login success/error and stores tokens

### Frontend Integration

The frontend stores authentication data in `localStorage` under the key `sapalens_auth`:

```javascript
const authData = JSON.parse(localStorage.getItem('sapalens_auth'));
// { accessToken, refreshToken, email, name, provider, ... }
```

For API requests, include the access token in the Authorization header:

```javascript
fetch('/api/endpoint', {
  headers: {
    'Authorization': `Bearer ${authData.accessToken}`
  }
});
```

---

## 🗄️ Redis Setup

Redis is used for:
- Rate limiting (stores request counts per IP)
- Session management (stores user sessions)
- Token storage (stores refresh tokens)

### Running Redis Locally

#### Option 1: Docker (Recommended)

```bash
# Run Redis in Docker
docker run -d --name redis -p 6379:6379 redis:latest

# Or using docker-compose (add to docker-compose.yml):
# redis:
#   image: redis:latest
#   ports:
#     - "6379:6379"
```

#### Option 2: WSL (Windows Subsystem for Linux)

```bash
# Install Redis on WSL
sudo apt update
sudo apt install redis-server

# Start Redis
sudo service redis-server start

# Check status
redis-cli ping
# Should return: PONG
```

#### Option 3: Native Installation

- **macOS**: `brew install redis && brew services start redis`
- **Linux**: `sudo apt install redis-server && sudo systemctl start redis`

### Redis Configuration

Configure Redis in your `.env` file:

```env
# Enable/disable Redis (default: true)
REDIS_ENABLED=true

# Option 1: Use connection URL (recommended)
REDIS_URL=redis://localhost:6379

# Option 2: Individual parameters
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

### Redis Fallback Behavior

If Redis is not available:
- The gateway will **continue to function normally**
- Rate limiting will use **in-memory storage** (resets on restart)
- Sessions/tokens will use **in-memory storage**
- A warning will be logged **once** (not spammed)
- Redis status is visible at `/health` and `/admin/api/stats`

### Redis Auto-Reconnection

The gateway automatically attempts to reconnect to Redis:
- **Retry strategy**: Exponential backoff (1s → 2s → 4s → 8s → 16s → 30s max)
- **Max attempts**: 10 per disconnection
- **Log throttling**: Same error logged max once per 15 seconds
- **Status endpoint**: Check `/health` to see Redis connection status

### Checking Redis Status

```bash
# Via health endpoint
curl http://localhost:3000/health

# Response includes:
# {
#   "status": "ok",
#   "redis": {
#     "enabled": true,
#     "connected": true,
#     "lastError": null,
#     "reconnectAttempts": 0
#   }
# }
```

### Disabling Redis

To run without Redis:

```env
REDIS_ENABLED=false
```

This is useful for development or when you don't need distributed rate limiting.

---

## 🐳 Docker

### Build Docker Image

```bash
docker build -t sapalens-gateway .
```

### Run Container

```bash
docker run -p 3000:3000 --env-file .env sapalens-gateway
```

### Docker Compose

```bash
docker-compose up -d
```

---

## 💻 Development

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with auto-reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm run type-check` | Check TypeScript types without building |
| `npm run lint` | Check for unused variables and parameters |

### Adding a New Service

1. **Register service in `src/config/services.ts`:**

```typescript
export const ServiceRegistry: Record<string, ServiceConfig> = {
  'new-service': {
    name: 'New Service',
    url: process.env.NEW_SERVICE_URL || 'http://localhost:3005',
    healthCheck: '/health',
    timeout: 5000
  }
};
```

2. **Add environment variable to `.env`:**

```env
NEW_SERVICE_URL=http://localhost:3005
```

3. **Service will be automatically available at gateway startup**

---

## 🔒 Security

- JWT token verification with remote JWKS
- CORS protection
- Rate limiting per IP
- Helmet.js security headers
- Input validation
- Error sanitization in production

---

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:3000/health
```

### Logs

Logs are written to:
- Console (development)
- `logs/error.log` (errors only)
- `logs/combined.log` (all logs)

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Run tests: `npm test`
4. Run linter: `npm run lint`
5. Submit a pull request

---

## 📝 License

MIT

---

## 👥 Authors

Sapalens Development Team

---

## 🆘 Support

For issues and questions, please contact the development team.