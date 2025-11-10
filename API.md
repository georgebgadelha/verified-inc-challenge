# API Documentation

All endpoints are available at `http://localhost:3000/v1`

Most endpoints require JWT authentication via the `Authorization: Bearer <token>` header.

## Quick Reference

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/v1/health` | Health check | No |
| POST | `/v1/auth/register` | Register new user | No |
| POST | `/v1/auth/login` | Login and get tokens | No |
| POST | `/v1/auth/refresh` | Refresh access token | No |
| GET | `/v1/users` | Get all users (admin only) | API Key |
| GET | `/v1/users/me` | Get your profile | Yes |
| DELETE | `/v1/users/:id` | Delete your account | Yes |
| POST | `/v1/groups` | Create a group | Yes |
| GET | `/v1/groups` | Get your groups | Yes |
| GET | `/v1/groups/:id` | Get group details | Yes |
| PATCH | `/v1/groups/:id` | Update group (admin only) | Yes |
| POST | `/v1/groups/:id/members` | Add members (admin only) | Yes |
| DELETE | `/v1/groups/:id/members/:userId` | Remove member | Yes |
| PATCH | `/v1/groups/:id/members/:userId/role` | Update member role (admin only) | Yes |
| POST | `/v1/messages` | Send a message | Yes |
| GET | `/v1/messages` | Get your messages (paginated) | Yes |
| GET | `/v1/messages/:id` | Get specific message | Yes |
| PATCH | `/v1/messages/:id` | Edit your message | Yes |
| DELETE | `/v1/messages/:id` | Delete your message | Yes |
| GET | `/v1/messages/:id/replies` | Get message replies | Yes |

---

## Authentication

### Register
**POST** `/v1/auth/register`

Create a new user account.

**Request:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "password": "SecurePass123!"
}
```

**Response:** `201 Created`
```json
{
  "user": {
    "id": "cm123...",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Notes:**
- Phone number must be in E.164 format (e.g., +1234567890)
- Password requirements: min 6 characters
- Email must be unique
- Returns access token (15 min) and refresh token (7 days)

---

### Login
**POST** `/v1/auth/login`

Login with existing credentials.

**Request:**
```json
{
  "email": "john@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "cm123...",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors:**
- `401 Unauthorized` - Invalid credentials
- `404 Not Found` - User doesn't exist

---

### Refresh Token
**POST** `/v1/auth/refresh`

Get a new access token (and new refresh token) using your current refresh token. Implements refresh token rotation for security.

**Request:**
```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:** `200 OK`
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Notes:**
- Returns both a new access token (15 min) and a new refresh token (7 days)
- The old refresh token becomes invalid immediately (token rotation)
- Frontend must store the new refresh token for the next refresh
- If refresh token is expired (7 days), user must login again

**Errors:**
- `401 Unauthorized` - Invalid or expired refresh token

---

## Users

### Get All Users (Admin)
**GET** `/v1/users`

Requires `X-API-Key` header with admin API key. Returns all users including deleted ones.

**Example:**
```bash
curl http://localhost:3000/v1/users \
  -H "X-API-Key: your-admin-api-key"
```

**Response:** `200 OK`
```json
[
  {
    "id": "cm123...",
    "name": "John Doe",
    "email": "john@example.com",
    "phoneNumber": "+1234567890",
    "isDeleted": false,
    "createdAt": "2025-11-07T10:00:00.000Z",
    "updatedAt": "2025-11-07T10:00:00.000Z",
    "deletedAt": null
  }
]
```

---

### Get My Profile
**GET** `/v1/users/me`

Get your own user profile.

**Example:**
```bash
curl http://localhost:3000/v1/users/me \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:** `200 OK`
```json
{
  "id": "cm123...",
  "name": "John Doe",
  "email": "john@example.com",
  "phoneNumber": "+1234567890",
  "createdAt": "2025-11-07T10:00:00.000Z",
  "updatedAt": "2025-11-07T10:00:00.000Z"
}
```

---

### Delete Account
**DELETE** `/v1/users/:id`

Soft delete your account. You can only delete your own account.

**Example:**
```bash
curl -X DELETE http://localhost:3000/v1/users/cm123... \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:** `200 OK`
```json
{
  "message": "Account successfully deleted. Your message history has been preserved."
}
```

**Errors:**
- `403 Forbidden` - Trying to delete someone else's account
- `404 Not Found` - User doesn't exist

---

## Groups

### Create Group
**POST** `/v1/groups`

Create a new group. You become the admin automatically.

**Request:**
```json
{
  "name": "Project Team",
  "description": "Team for the new project",
  "memberIds": ["user-id-1", "user-id-2"]
}
```

**Response:** `201 Created`
```json
{
  "id": "group-123",
  "name": "Project Team",
  "description": "Team for the new project",
  "createdById": "your-user-id",
  "createdAt": "2025-11-07T10:00:00.000Z",
  "members": [
    {
      "userId": "your-user-id",
      "role": "admin",
      "user": {
        "name": "You"
      }
    },
    {
      "userId": "user-id-1",
      "role": "member",
      "user": {
        "name": "John"
      }
    }
  ]
}
```

---

### Get My Groups
**GET** `/v1/groups`

Get all groups where you're a member.

**Response:** `200 OK`
```json
[
  {
    "id": "group-123",
    "name": "Project Team",
    "description": "Team for the new project",
    "memberCount": 3,
    "myRole": "admin"
  }
]
```

---

### Get Group Details
**GET** `/v1/groups/:id`

Get detailed information about a group, including all members.

**Response:** `200 OK`
```json
{
  "id": "group-123",
  "name": "Project Team",
  "description": "Team for the new project",
  "createdById": "user-123",
  "createdAt": "2025-11-07T10:00:00.000Z",
  "members": [
    {
      "userId": "user-123",
      "role": "admin",
      "joinedAt": "2025-11-07T10:00:00.000Z",
      "user": {
        "id": "user-123",
        "name": "John Doe",
        "email": "john@example.com"
      }
    }
  ]
}
```

---

### Update Group
**PATCH** `/v1/groups/:id`

Update group name/description. Admin only.

**Request:**
```json
{
  "name": "Updated Team Name",
  "description": "New description"
}
```

**Response:** `200 OK`
```json
{
  "id": "group-123",
  "name": "Updated Team Name",
  "description": "New description"
}
```

---

### Add Members
**POST** `/v1/groups/:id/members`

Add new members to the group. Admin only.

**Request:**
```json
{
  "userIds": ["user-id-3", "user-id-4"]
}
```

**Response:** `200 OK`
```json
{
  "id": "group-123",
  "name": "Project Team",
  "members": [
    // ... all members including new ones
  ]
}
```

**Errors:**
- `403 Forbidden` - Not an admin
- `409 Conflict` - User already in group

---

### Remove Member
**DELETE** `/v1/groups/:id/members/:userId`

Remove a member from the group. Admins can remove others (except the creator), anyone can leave.

**Response:** `200 OK`
```json
{
  "message": "Member removed successfully"
}
```

**Errors:**
- `403 Forbidden` - Can't remove the group creator
- `404 Not Found` - Group or user not found

---

### Update Member Role
**PATCH** `/v1/groups/:id/members/:userId/role`

Promote a member to admin or demote an admin to member. Admin only.

**Request:**
```json
{
  "role": "admin"
}
```

**Response:** `200 OK`
```json
{
  "message": "Member promoted to admin successfully"
}
```

**Errors:**
- `403 Forbidden` - Not an admin or trying to demote last admin
- `400 Bad Request` - Member already has that role

---

## Messages

### Send Message
**POST** `/v1/messages`

Send a direct message or group message. Sender is automatically set to authenticated user.

**Request (Direct Message):**
```json
{
  "content": "Hey, how are you?",
  "receiverId": "user-id-456"
}
```

**Request (Group Message):**
```json
{
  "content": "Hello everyone!",
  "groupId": "group-id-789"
}
```

**Request (Reply):**
```json
{
  "content": "I'm doing great!",
  "receiverId": "user-id-456",
  "replyToId": "message-id-123"
}
```

**Response:** `201 Created`
```json
{
  "id": "msg-123",
  "content": "Hey, how are you?",
  "senderId": "your-user-id",
  "receiverId": "user-id-456",
  "groupId": null,
  "replyToId": null,
  "senderName": "Your Name",
  "senderPhone": "+1234567890",
  "receiverName": "Their Name",
  "receiverPhone": "+0987654321",
  "createdAt": "2025-11-07T10:00:00.000Z",
  "updatedAt": "2025-11-07T10:00:00.000Z"
}
```

**Notes:**
- Must provide either `receiverId` OR `groupId`, not both
- For group messages, you must be a member
- Content max length: 5000 characters

---

### Get My Messages
**GET** `/v1/messages?cursor=xxx&limit=20&sort=desc`

Get messages where you're either the sender or receiver. Uses cursor-based pagination.

**Query Parameters:**
- `cursor` (optional) - Pagination cursor from previous response
- `limit` (optional) - Messages per page (default: 20, max: 100)
- `sort` (optional) - `desc` (newest first, default) or `asc` (oldest first)

**Example:**
```bash
# First page
curl http://localhost:3000/v1/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Next page using cursor
curl "http://localhost:3000/v1/messages?cursor=2025-11-07T10:00:00.000Z_msg-123" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "msg-123",
      "content": "Latest message",
      "senderId": "user-1",
      "receiverId": "user-2",
      "createdAt": "2025-11-07T10:00:00.000Z",
      "updatedAt": "2025-11-07T10:00:00.000Z"
    }
  ],
  "meta": {
    "count": 20,
    "limit": 20,
    "nextCursor": "2025-11-07T09:00:00.000Z_msg-456",
    "prevCursor": "2025-11-07T10:00:00.000Z_msg-123",
    "hasMore": true
  }
}
```

---

### Get Specific Message
**GET** `/v1/messages/:id`

Get a single message by ID.

**Response:** `200 OK`
```json
{
  "id": "msg-123",
  "content": "Hello!",
  "senderId": "user-1",
  "receiverId": "user-2",
  "createdAt": "2025-11-07T10:00:00.000Z",
  "updatedAt": "2025-11-07T10:00:00.000Z"
}
```

---

### Edit Message
**PATCH** `/v1/messages/:id`

Edit your own message. Only the sender can edit.

**Request:**
```json
{
  "content": "Updated message content"
}
```

**Response:** `200 OK`
```json
{
  "id": "msg-123",
  "content": "Updated message content",
  "senderId": "your-user-id",
  "updatedAt": "2025-11-07T10:05:00.000Z"
}
```

**Errors:**
- `403 Forbidden` - Not your message
- `404 Not Found` - Message doesn't exist

---

### Delete Message
**DELETE** `/v1/messages/:id`

Delete your own message. Only the sender can delete.

**Response:** `204 No Content`

**Errors:**
- `403 Forbidden` - Not your message
- `404 Not Found` - Message doesn't exist

---

### Get Message Replies
**GET** `/v1/messages/:id/replies`

Get all replies to a specific message (threaded conversation).

**Response:** `200 OK`
```json
[
  {
    "id": "msg-456",
    "content": "This is a reply",
    "senderId": "user-2",
    "receiverId": "user-1",
    "replyToId": "msg-123",
    "createdAt": "2025-11-07T10:01:00.000Z"
  }
]
```

---

### Get Group Messages
**GET** `/v1/groups/:id/messages?cursor=xxx&limit=20&sort=desc`

Get all messages for a specific group. Only group members can view. Uses cursor-based pagination.

**Path Parameters:**
- `id` (required) - UUID of the group

**Query Parameters:**
- `cursor` (optional) - Pagination cursor from `meta.nextCursor`
- `limit` (optional) - Messages per page (default: 20, max: 100)
- `sort` (optional) - Sort order: `asc` or `desc` (default: `desc`)

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "msg-789",
      "content": "Hello everyone!",
      "senderId": "user-1",
      "receiverId": null,
      "groupId": "group-123",
      "replyToId": null,
      "senderName": "John Doe",
      "senderPhone": "+1234567890",
      "receiverName": null,
      "receiverPhone": null,
      "createdAt": "2025-11-07T10:00:00.000Z",
      "updatedAt": "2025-11-07T10:00:00.000Z"
    }
  ],
  "meta": {
    "count": 20,
    "limit": 20,
    "nextCursor": "2025-11-07T10:00:00.000Z_msg-789",
    "prevCursor": "2025-11-07T09:00:00.000Z_msg-001",
    "hasMore": true
  }
}
```

**Errors:**
- `400 Bad Request` - Invalid cursor format or not a group member
- `404 Not Found` - Group doesn't exist
- `401 Unauthorized` - Not authenticated

---

## Health Check

### Check API Health
**GET** `/v1/health`

No authentication required. Returns API health status.

**Response:** `200 OK`
```json
{
  "status": "ok",
  "timestamp": "2025-11-07T10:00:00.000Z",
  "uptime": "3600s",
  "database": {
    "status": "up"
  },
  "memory": {
    "heapUsed": "45MB",
    "heapTotal": "60MB",
    "rss": "120MB"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "statusCode": 400,
  "message": "Error description or array of validation errors",
  "error": "Bad Request"
}
```

**Common Status Codes:**
- `400 Bad Request` - Invalid input/validation failed
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - Not allowed to perform this action
- `404 Not Found` - Resource doesn't exist
- `409 Conflict` - Resource already exists
- `500 Internal Server Error` - Something went wrong

---

## Rate Limiting

Global rate limit: 100 requests per minute per IP address.

When exceeded, you'll receive:
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

---

## Swagger Documentation

Interactive API docs available at: `http://localhost:3000/api`

Try out endpoints directly from your browser with the Swagger UI.
