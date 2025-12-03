# Advanced TypeScript Patterns

## Discriminated Unions

```typescript
type ApiResponse<T> =
  | { status: "success"; data: T }
  | { status: "error"; error: string }
  | { status: "loading" };

function handleResponse<T>(response: ApiResponse<T>) {
  switch (response.status) {
    case "success":
      return response.data; // TypeScript knows data exists
    case "error":
      throw new Error(response.error); // TypeScript knows error exists
    case "loading":
      return null;
  }
}
```

## Generic Constraints

```typescript
interface HasId {
  id: string;
}

function findById<T extends HasId>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}
```

## Utility Types

```typescript
// Make all properties optional
type PartialUser = Partial<User>;

// Pick specific properties
type UserPreview = Pick<User, "id" | "name">;

// Omit specific properties
type UserWithoutPassword = Omit<User, "password">;
```
