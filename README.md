# Chat API

Backend for a simple chat system. Send messages, reply to them, edit, delete.

## Stack

Pretty standard: Node.js 22, NestJS 11, TypeScript, PostgreSQL with Prisma, Swagger docs, Docker.

## Quick Start

```bash
npm run docker:up
```

**That's it!** The containers will:
1. Start PostgreSQL
2. Create database schema automatically
3. Seed with sample users (Alice & Bob)
4. Start the API on http://localhost:3000

**Test it:**
That's it. Check health at `http://localhost:3000/v1/health` or browse the API at `http://localhost:3000/api` (Swagger UI). See [API.md](./API.md) for curl examples.

Stop with `npm run docker:down`.

## Implemented Features

# Testing
npm test                 # Run all unit tests
```

## Optional features chosen to be implemented

- API versioning (v1)
- Pagination with metadata
- Ability to limit amount of messages returned from GET /messages and sort as well
- Swagger/OpenAPI documentation
- Rate limiting (100 req/min globally)
- Request logging middleware (audit trail)
- Enhanced health check (database, memory, uptime)

## Future Enhancements

### High Priority

- **Refine Rate Limiting** - Currently applied globally at 100 req/min. For a chat API, this should be more nuanced:
  - Remove rate limits from GET endpoints (reading is harmless)
  - Apply stricter limits to POST /messages (e.g., 60/min to prevent spam)
  - Keep strict limits on authentication endpoints (when implemented)
  - Consider implementing soft limits with degradation instead of hard blocks

- **CORS Configuration** - Add proper CORS headers for production frontend integration with configurable allowed origins

- **Authentication & Authorization** - Implement JWT-based authentication with role-based access control

### Medium Priority

- **Message Filtering** - Add query parameters to filter messages:
  - `?senderId=xxx` - Get messages from specific sender
  - `?receiverId=xxx` - Get messages to specific receiver
  - `?startDate=xxx&endDate=xxx` - Filter by date range

## What Works

- Messages: create, read (with pagination), update, delete
- Replies to messages (hierarchical)
- Sorting (by date or content)
- Validation (UUIDs, required fields, etc.)
- Health check endpoint
- Swagger docs
- Request logging

## What's Missing

Some stuff I'd add if this were production:

- **Soft delete** - So we don't loose the message, better for auditing
- ** Bulk operations ** - Like deleting multiple messages
- **Tests with a dedicated test database** - Currently e2e tests hit the dev db
- **Caching** - Redis for frequently accessed messages or user's status
- **Auth** - No login/permissions yet
- **WebSockets** - Real-time updates would be nice
- **Field selection** - Let clients pick which fields they want back
- **More environments** - Just dev right now

## Tests

Got unit tests, integration tests, and e2e tests. Run with `npm test` or `npm run test:e2e` (needs the db running).

Coverage includes:
- Message CRUD
- Pagination & sorting
- Input validation  
- Error handling
- Reply chains
- Health checks

The e2e tests clean up after themselves.

```
