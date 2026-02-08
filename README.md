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
| `npm run lint` | Lint code with ESLint |
| `npm run format` | Format code with Prettier |
| `npm test` | Run tests |

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