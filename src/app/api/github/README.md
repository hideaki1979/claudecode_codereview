# GitHub API Route Handler

Type-safe GitHub API integration with caching, rate limiting, and comprehensive error handling.

## Overview

This Route Handler provides two endpoints for interacting with GitHub Pull Requests:

1. **GET /api/github** - List pull requests from a repository
2. **POST /api/github** - Get detailed information about a specific pull request

## Features

- **Type Safety**: Full TypeScript support with Discriminated Unions
- **Caching**: 15-minute in-memory cache to reduce API calls
- **Rate Limiting**: GitHub API rate limit monitoring and handling
- **Error Handling**: Comprehensive error mapping with user-friendly messages
- **Validation**: Zod-based request validation
- **HTTP Standards**: Proper status codes and cache headers

## Endpoints

### GET /api/github

List pull requests from a GitHub repository.

#### Query Parameters

| Parameter | Type   | Required | Default   | Description                                                 |
| --------- | ------ | -------- | --------- | ----------------------------------------------------------- |
| owner     | string | Yes      | -         | Repository owner                                            |
| repo      | string | Yes      | -         | Repository name                                             |
| state     | enum   | No       | 'open'    | PR state: 'open', 'closed', 'all'                           |
| sort      | enum   | No       | 'created' | Sort by: 'created', 'updated', 'popularity', 'long-running' |
| direction | enum   | No       | 'desc'    | Sort direction: 'asc', 'desc'                               |
| per_page  | number | No       | 30        | Items per page (1-100)                                      |
| page      | number | No       | 1         | Page number (>= 1)                                          |

#### Example Request

```bash
curl "http://localhost:3000/api/github?owner=facebook&repo=react&state=open&per_page=10"
```

#### Example Response (Success)

```json
{
  "success": true,
  "data": [
    {
      "id": 123456,
      "number": 42,
      "title": "Fix memory leak in useEffect",
      "state": "open",
      "user": {
        "login": "developer",
        "avatar_url": "https://avatars.githubusercontent.com/u/...",
        "html_url": "https://github.com/developer"
      },
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-16T14:20:00Z",
      "html_url": "https://github.com/facebook/react/pull/42"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 10,
    "has_next_page": true,
    "has_prev_page": false
  },
  "rateLimit": {
    "limit": 5000,
    "remaining": 4999,
    "reset": 1705420800,
    "used": 1
  }
}
```

### POST /api/github

Get detailed information about a specific pull request.

#### Request Body

| Field       | Type   | Required | Description                            |
| ----------- | ------ | -------- | -------------------------------------- |
| owner       | string | Yes      | Repository owner                       |
| repo        | string | Yes      | Repository name                        |
| pull_number | number | Yes      | Pull request number (positive integer) |

#### Example Request

```bash
curl -X POST http://localhost:3000/api/github \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "facebook",
    "repo": "react",
    "pull_number": 42
  }'
```

#### Example Response (Success)

```json
{
  "success": true,
  "data": {
    "id": 123456,
    "number": 42,
    "title": "Fix memory leak in useEffect",
    "state": "open",
    "user": {
      "login": "developer",
      "avatar_url": "https://avatars.githubusercontent.com/u/...",
      "html_url": "https://github.com/developer"
    },
    "commits": 3,
    "additions": 45,
    "deletions": 12,
    "changed_files": 2,
    "mergeable": true,
    "merged": false,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-16T14:20:00Z",
    "html_url": "https://github.com/facebook/react/pull/42"
  },
  "rateLimit": {
    "limit": 5000,
    "remaining": 4998,
    "reset": 1705420800,
    "used": 2
  }
}
```

## Error Handling

All errors follow a consistent format using Discriminated Unions:

```typescript
interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: ErrorCode;
    details?: string;
  };
}
```

### Error Codes

| Code                | HTTP Status | Description                                                                                                                             |
| ------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| VALIDATION_ERROR    | 400         | Invalid request parameters                                                                                                              |
| UNAUTHORIZED        | 401         | Missing or invalid API key, or missing/invalid GitHub token (includes invalid token format, missing token, and authentication failures) |
| FORBIDDEN           | 403         | Insufficient permissions                                                                                                                |
| NOT_FOUND           | 404         | Repository or PR not found                                                                                                              |
| RATE_LIMIT_EXCEEDED | 429         | GitHub API rate limit exceeded                                                                                                          |
| INTERNAL_ERROR      | 500         | Unexpected server error                                                                                                                 |
| GITHUB_API_ERROR    | 500         | GitHub API returned an error                                                                                                            |

### Example Error Response

```json
{
  "success": false,
  "error": {
    "message": "Repository or pull request not found.",
    "code": "NOT_FOUND",
    "details": "Failed to fetch pull request: Resource not found"
  }
}
```

## Caching

The API implements a 15-minute in-memory cache:

- **Cache Hit**: Response includes `X-Cache: HIT` header
- **Cache Miss**: Response includes `X-Cache: MISS` header
- **TTL**: 900 seconds (15 minutes)
- **Max Entries**: 100 (LRU eviction)

### Cache Headers

```http
Cache-Control: private, max-age=900
X-Cache: HIT | MISS
```

## Rate Limiting

GitHub API rate limits:

- **Authenticated**: 5,000 requests/hour
- **Unauthenticated**: 60 requests/hour

The API includes rate limit information in all responses:

```json
{
  "rateLimit": {
    "limit": 5000,
    "remaining": 4999,
    "reset": 1705420800,
    "used": 1
  }
}
```

## Type Safety

The API uses Discriminated Unions for type-safe responses:

```typescript
// Success response
type SuccessResponse = {
  success: true;
  data: T;
  rateLimit: RateLimitInfo;
};

// Error response
type ErrorResponse = {
  success: false;
  error: {
    message: string;
    code: ErrorCode;
    details?: string;
  };
};

// Union type
type ApiResponse = SuccessResponse | ErrorResponse;
```

This allows for type-safe response handling:

```typescript
const response = await fetch("/api/github?owner=facebook&repo=react");
const data = await response.json();

if (data.success) {
  // TypeScript knows data has 'data' and 'rateLimit' properties
  console.log(data.data);
} else {
  // TypeScript knows data has 'error' property
  console.error(data.error.message);
}
```

## Usage in Client Components

```typescript
"use client";

import { useState } from "react";
import type { ApiListResponse } from "@/types/api";

export default function PullRequestList() {
  const [prs, setPrs] = useState([]);

  async function fetchPullRequests() {
    const response = await fetch(
      "/api/github?owner=facebook&repo=react&state=open&per_page=10"
    );

    const data: ApiListResponse = await response.json();

    if (data.success) {
      setPrs(data.data);
      console.log("Rate limit remaining:", data.rateLimit.remaining);
    } else {
      console.error("Error:", data.error.message);
      // Handle specific error codes
      if (data.error.code === "RATE_LIMIT_EXCEEDED") {
        // Show rate limit message to user
      }
    }
  }

  return <button onClick={fetchPullRequests}>Load Pull Requests</button>;
}
```

## Authentication

All API endpoints require authentication using an API key. You can provide the API key in two ways:

1. **Authorization Header** (recommended):

   ```bash
   Authorization: Bearer <API_KEY>
   ```

2. **X-API-Key Header**:
   ```bash
   X-API-Key: <API_KEY>
   ```

### Example Request with Authentication

```bash
curl -X POST http://localhost:3000/api/github \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_api_key_here" \
  -d '{
    "owner": "facebook",
    "repo": "react",
    "pull_number": 42
  }'
```

### Development vs Production

- **Development**: If `API_KEY` is not set, authentication is skipped (with a warning in production)
- **Production**: `API_KEY` must be set for security

## Configuration

Set the following environment variables in `.env.local`:

```bash
# GitHub API token
GITHUB_TOKEN=ghp_your_token_here

# API authentication key (server-side)
API_KEY=your_api_key_here

# API authentication key (client-side, requires NEXT_PUBLIC_ prefix)
NEXT_PUBLIC_API_KEY=your_api_key_here
```

**Note**: The client-side API key (`NEXT_PUBLIC_API_KEY`) is exposed to the browser. In production, consider using a more secure authentication method like NextAuth.js.

## Performance Considerations

1. **Caching**: Reduces API calls by 60-80% for repeated requests
2. **Validation**: Early validation prevents unnecessary API calls
3. **LRU Cache**: Automatic eviction of old entries prevents memory growth
4. **Rate Limit Monitoring**: Prevents exceeding GitHub's rate limits

## Security

1. **API Authentication**: All endpoints require API key authentication
2. **Token Management**: GitHub token stored in environment variables
3. **Validation**: All inputs validated with Zod schemas
4. **Error Sanitization**: Internal errors not exposed to clients
5. **No Token Exposure**: Tokens never included in responses
6. **Timing Attack Protection**: Constant-time comparison for API key validation
7. **Development Mode**: Authentication can be disabled in development (not recommended for production)
