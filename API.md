# API Docs

All endpoints are under `http://localhost:3000/v1`

## Endpoints

| Method | Endpoint | What it does |
|--------|----------|-------------|
| GET | `/v1/health` | Health check |
| POST | `/v1/messages` | Send a message |
| GET | `/v1/messages` | List messages (paginated) |
| GET | `/v1/messages/:id` | Get one message |
| PATCH | `/v1/messages/:id` | Edit message |
| DELETE | `/v1/messages/:id` | Delete message |
| GET | `/v1/messages/:id/replies` | Get replies to a message |

---

### Health Check
**GET** `/v1/health`

```bash
curl http://localhost:3000/v1/health
```

**Response:** `200 OK`
```json
{
  "status": "ok",
  "info": {
    "database": { "status": "up" }
  }
}
```

---

### Send Message
**POST** `/v1/messages`

**Request Body:**
```json
{
  "content": "Hello, world!",
  "senderId": "uuid-of-sender",
  "receiverId": "uuid-of-receiver",
  "replyToId": "uuid-of-parent-message" // Optional
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/v1/messages \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hey Bob, how are you?",
    "senderId": "ALICE_UUID",
    "receiverId": "BOB_UUID"
  }'
```

**Response:** `201 Created`
```json
{
  "id": "cm12abc...",
  "content": "Hey Bob, how are you?",
  "senderId": "cm12...",
  "receiverId": "cm12...",
  "replyToId": null,
  "createdAt": "2025-11-04T10:30:00.000Z",
  "updatedAt": "2025-11-04T10:30:00.000Z"
}
```

---

### List Messages
**GET** `/v1/messages?page=1&limit=20&sort=desc`

**Query Params:**
- `page` - Page number (default: 1, min: 1)
- `limit` - Messages per page (default: 20, min: 1, max: 100)
- `sort` - `desc` (newest first, default) or `asc` (oldest first)

```bash
# Default (20 messages, newest first)
curl http://localhost:3000/v1/messages

# Page 2, 10 per page
curl http://localhost:3000/v1/messages?page=2&limit=10

# Oldest first
curl http://localhost:3000/v1/messages?sort=asc

# Page 3, 5 messages, oldest first
curl http://localhost:3000/v1/messages?page=3&limit=5&sort=asc
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "cm12abc...",
      "content": "Most recent message",
      "senderId": "cm12...",
      "receiverId": "cm12...",
      "replyToId": null,
      "createdAt": "2025-11-04T10:30:00.000Z",
      "updatedAt": "2025-11-04T10:30:00.000Z"
    },
    {
      "id": "cm12xyz...",
      "content": "Second most recent",
      "senderId": "cm12...",
      "receiverId": "cm12...",
      "replyToId": "cm12abc...",
      "createdAt": "2025-11-04T10:25:00.000Z",
      "updatedAt": "2025-11-04T10:25:00.000Z"
    }
  ],
  "meta": {
    "currentPage": 1,
    "pageSize": 20,
    "totalItems": 47,
    "totalPages": 3,
    "hasNextPage": true,
    "hasPreviousPage": false,
    "nextPage": 2,
    "previousPage": null
  }
}
```

The `meta` object tells you what page you're on, how many total pages/items exist, and whether there's a next/previous page.

---

### Get One Message
**GET** `/v1/messages/:id`

**Example:**
```bash
curl http://localhost:3000/v1/messages/cm12abc...
```

**Response:** `200 OK`
```json
{
  "id": "cm12abc...",
  "content": "Hello, world!",
  "senderId": "cm12...",
  "receiverId": "cm12...",
  "replyToId": null,
  "createdAt": "2025-11-04T10:30:00.000Z",
  "updatedAt": "2025-11-04T10:30:00.000Z"
}
```

**Error:** `404 Not Found`
```json
{
  "statusCode": 404,
  "message": "Message with ID cm12abc... not found",
  "error": "Not Found"
}
```

---

### Edit Message
**PATCH** `/v1/messages/:id`

Only updates the `content` field. Everything else (sender, receiver, timestamps) stays the same.

**Request Body:**
```json
{
  "content": "Updated message content"
}
```

**Example:**
```bash
curl -X PATCH http://localhost:3000/v1/messages/cm12abc... \
  -H "Content-Type: application/json" \
  -d '{"content": "Edited: Hello, world!"}'
```

**Response:** `200 OK`
```json
{
  "id": "cm12abc...",
  "content": "Edited: Hello, world!",
  "senderId": "cm12...",
  "receiverId": "cm12...",
  "replyToId": null,
  "createdAt": "2025-11-04T10:30:00.000Z",
  "updatedAt": "2025-11-04T10:35:00.000Z"
}
```

---

### Delete Message
**DELETE** `/v1/messages/:id`

Deletes the message. Any replies to it will have their `replyToId` set to `null`.

**Example:**
```bash
curl -X DELETE http://localhost:3000/v1/messages/cm12abc...
```

**Response:** `204 No Content`
(No body returned)

---

### Get Replies
**GET** `/v1/messages/:id/replies`

Returns all replies to a message.

**Example:**
```bash
curl http://localhost:3000/v1/messages/cm12abc.../replies
```

**Response:** `200 OK`
```json
[
  {
    "id": "cm12xyz...",
    "content": "This is a reply",
    "senderId": "cm12...",
    "receiverId": "cm12...",
    "replyToId": "cm12abc...",
    "createdAt": "2025-11-04T10:32:00.000Z",
    "updatedAt": "2025-11-04T10:32:00.000Z"
  }
]
```

Replies are sorted oldest first. Returns `[]` if none exist.

---

**Creating a message:**
- `content` - required, max 5000 chars
- `senderId` - required, valid UUID
- `receiverId` - required, valid UUID
- `replyToId` - optional, valid UUID

**Updating a message:**
- `content` - optional, max 5000 chars

Invalid input returns `400`:
```json
{
  "statusCode": 400,
  "message": [
    "content must be shorter than or equal to 5000 characters",
    "senderId must be a UUID"
  ],
  "error": "Bad Request"
}
```

---

## Errors

| Status | Description |
|--------|-------------|
| `400 Bad Request` | Invalid input (validation failed) |
| `404 Not Found` | Resource doesn't exist |
| `500 Internal Server Error` | Server error |

All errors follow the format:
```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```
