# Next.js App Router Conventions

## File Structure

```
app/
├── layout.tsx          # Root layout
├── page.tsx            # Home page
├── api/
│   └── reviews/
│       └── route.ts    # API endpoint
├── (dashboard)/        # Route group
│   ├── layout.tsx
│   └── reviews/
│       └── page.tsx
└── components/         # Not routable
```

## Server vs Client Components

```typescript
// Server Component (default)
async function ReviewList() {
  const reviews = await fetchReviews(); // Direct DB access
  return <div>{/* Render */}</div>;
}

// Client Component (explicit)
"use client";

import { useState } from "react";

function ReviewFilter() {
  const [filter, setFilter] = useState("all");
  return <select onChange={(e) => setFilter(e.target.value)} />;
}
```

## Data Fetching

```typescript
// Server Component - Fetch during render
async function Page() {
  const res = await fetch("https://api.example.com/data", {
    next: { revalidate: 3600 }, // ISR
  });

  const data = await res.json();
  return <div>{/* data を整形して描画 */}</div>;
}

// Use parallel fetching
async function Page() {
  const [users, posts] = await Promise.all([fetchUsers(), fetchPosts()]);

  return <Dashboard users={users} posts={posts} />;
}
```
