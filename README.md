# Chat API Backend

A backend API for a chat system with user authentication, direct messaging, group chats, and message threading.

## Tech Stack

- **Node.js 22** with **TypeScript** for type safety
- **NestJS 11** as the framework (provides good structure out of the box)
- **PostgreSQL** for the database
- **Prisma ORM** for type-safe database queries and migrations
- **JWT** for authentication (access + refresh tokens)
- **Redis** for caching group membership checks
- **Docker** for easy local setup
- **Swagger** for API documentation

## Getting Started

Make sure you have Docker installed, then:

```bash
npm run docker:up
```

This command will:
1. Start PostgreSQL and Redis containers
2. Run database migrations automatically
3. Seed the database with test users:
   - **Alice**: alice@example.com / password123
   - **Bob**: bob@example.com / password123
   - **Charlie**: charlie@example.com / password123
4. Start the API on http://localhost:3000

That's it! The API is ready to use.

### Quick Test

Check if everything's running:
```bash
curl http://localhost:3000/v1/health
```

Or open http://localhost:3000/api in your browser to see the interactive Swagger documentation.

### Stopping

```bash
npm run docker:down
```

## What's Implemented

### Core Features
- **User Authentication**: Register, login with JWT tokens (15-min access, 7-day refresh)
- **User Management**: Get profile, delete account (soft delete)
- **Direct Messages**: Send messages to other users
- **Group Chats**: Create groups, add/remove members, assign admin roles
- **Message Threading**: Reply to messages, view all replies
- **Message Management**: Edit and delete your own messages
- **Pagination**: Cursor-based pagination for consistent results even with new data

### Technical Features
- **JWT Authentication**: Secure token-based auth with refresh token flow
- **Role-Based Authorization**: Group admins vs members with different permissions
- **Input Validation**: Strong validation on all inputs (email format, phone numbers, UUIDs, etc.)
- **Error Handling**: Consistent error responses across the API
- **Redis Caching**: Group membership validation cached (big reduction in DB queries)
- **Rate Limiting**: 100 requests per minute to prevent abuse (this would be more granular making read endpoints more loosely and write operations with specific numbers of requests per endpoint)
- **Request Logging**: All requests logged with timestamp, method, route, and response time
- **Health Checks**: Endpoint to check API status, database connection, and memory usage
- **Database Optimization**: Composite indexes on frequently queried columns
- **Field Selection**: Only fetch needed fields from the database
- **API Versioning**: All routes under `/v1` prefix for future compatibility

### Admin Features
- **Admin API Key**: Special endpoint to get all users (including deleted) with API key authentication

## API Documentation

Complete API documentation is in [API.md](./API.md). It covers all endpoints with request/response examples.

Quick overview of main endpoints:

**Authentication:**
- `POST /v1/auth/register` - Create account
- `POST /v1/auth/login` - Login
- `POST /v1/auth/refresh` - Refresh access token

**Users:**
- `GET /v1/users/me` - Your profile
- `DELETE /v1/users/:id` - Delete your account
- `GET /v1/users` - Get all users (requires admin API key)

**Groups:**
- `POST /v1/groups` - Create a group
- `GET /v1/groups` - Your groups
- `POST /v1/groups/:id/members` - Add members (admin only)
- `PATCH /v1/groups/:id/members/:userId/role` - Promote/demote members (admin only)

**Messages:**
- `POST /messages` - Send a message (direct or group)
- `GET /messages` - Your messages (paginated)
- `PATCH /messages/:id` - Edit your message
- `DELETE /messages/:id` - Delete your message
- `GET /messages/:id/replies` - View message thread

## Development

If you want to run it locally without Docker:

```bash
# Install dependencies
npm install

# Set up .env file (copy from .env.example)
cp .env.example .env

# Make sure PostgreSQL and Redis are running locally
# Update DATABASE_URL in .env to point to your local DB

# Run migrations and seed
npm run prisma:migrate
npm run prisma:seed

# Start in dev mode
npm run dev
```

The API will be available at http://localhost:3000

## Testing

```bash
# Run unit tests
npm test

# Run e2e tests (needs database running)
npm run test:e2e
```

Tests cover:
- Message CRUD operations
- Cursor-based pagination logic
- Input validation
- Error scenarios (404s, validation failures)
- Health checks

Note: Auth and group tests would be added in a full implementation.

## Design Decisions

A few notes on choices I made:

**Why NestJS?** It provides good structure with dependency injection, decorators, and modules. Makes the codebase easier to navigate and maintain compared to plain Express.

**Why Prisma?** Type-safe database queries are great. You catch errors at compile time instead of runtime. Plus migrations are straightforward.

**JWT Tokens:** Using access + refresh token pattern. Access tokens expire quickly (15 min) for security, refresh tokens last 7 days. In production I'd add token rotation and a revocation list in Redis.

**Cursor Pagination:** Went with cursor-based instead of offset pagination because it handles new data better. If someone sends a message while you're browsing, you won't see duplicates or skip messages.

**Soft Delete:** Users are soft-deleted (marked as deleted, not actually removed). Keeps message history intact and allows for account recovery if needed.

**Redis Caching:** Group membership checks are cached because they're read frequently but change rarely. As the project would expand we could approach this caching strategy on differente perspectives such as user status on chat

**Security:** Passwords hashed with bcrypt (10 rounds), phone numbers validated to E.164 format, all IDs are UUIDs to prevent enumeration attacks. Users can only edit/delete their own messages.

## What I'd Add With More Time

**WebSockets:** Real-time message delivery would be nice. Right now it's REST-only so clients need to poll.

**Read Receipts:** Track when messages are read, show "read by" status.

**Message Search:** Full-text search across message content. Would probably use PostgreSQL's built-in full-text search or Elasticsearch.

**File Attachments:** Support for sending images, documents, etc. Would need file upload to a blob storage such as S3 or similar.

**Push Notifications:** Alert users of new messages when they're offline.

**More Granular Permissions:** Currently groups just have admins and members but the usage of an admin in a group is not implemented due to time constraints of this delivery + out of scope for this current MVP. We could also add moderators, custom roles, etc.

**Better Rate Limiting:** Right now it's 100 req/min globally. Should be per-endpoint with different limits (stricter on POST, looser on GET).

**Observability:** Add proper logging with Winston or Pino, metrics with Prometheus, distributed tracing etc.

**More Tests:** Current coverage is decent but could add more edge cases, load tests, and chaos testing.

**Refresh Token Storage:** Currently storing refresh tokens in PostgreSQL for simplicity. In production I'd migrate to Redis for faster lookups (O(1) vs table scan), automatic TTL expiration, and multi-device session management. Would reduce database load since token refresh happens frequently.

**Database Scaling:** For production at scale, I'd configure explicit connection pooling limits based on load testing (Prisma uses defaults which work for most cases, but tuning `connection_limit` and `pool_timeout` in the DATABASE_URL can prevent connection exhaustion under heavy load). Also consider read replicas for scaling read operations, and potentially database sharding for very large datasets.

## Project Structure

```
src/
├── auth/           # Authentication (JWT, guards, strategies)
├── users/          # User management
├── groups/         # Group chat functionality
├── messages/       # Messaging (CRUD, replies)
├── cache/          # Redis caching layer
├── prisma/         # Database client
├── health/         # Health check endpoint
└── common/         # Shared middleware, decorators
```

Each module follows the same pattern: controller → service → database. Keeps things consistent and easy to find.

## Performance Optimizations

Things I did to make it faster:

1. **Composite indexes** on `(createdAt, id)` for efficient cursor pagination
2. **Redis caching** for group membership checks (a lot of DB queries will be skipped due to this)
3. **Field selection** - only fetch the fields we actually need
4. **findUnique instead of findFirst** where possible (faster lookups)

## Environment Variables

Key environment variables (see `.env.example`):

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for signing access tokens
- `JWT_REFRESH_SECRET` - Secret for signing refresh tokens
- `ADMIN_API_KEY` - API key for admin endpoints
- `REDIS_HOST` / `REDIS_PORT` - Redis connection for caching
- `PORT` - API port (default 3000)
