---
name: typescript-best-practices
description: TypeScript and Next.js best practices checker for modern web development
allowed-tools:
  - Bash
  - Read
  - Edit
---

# TypeScript & Next.js Best Practices Skill

This skill provides comprehensive guidance for writing high-quality TypeScript and Next.js code following industry best practices.

## Core Principles

### Type Safety

- Use strict type checking
- Avoid `any` types
- Leverage discriminated unions
- Implement proper generic constraints

### Next.js Patterns

- Use App Router conventions
- Implement Server Components by default
- Apply proper data fetching patterns
- Optimize with React Server Components

## Automated Checks

When this skill is active, automatically verify:

1. **Type Coverage**

```bash
   npx type-coverage --at-least 95
```

2. **ESLint Rules**

   - No explicit any
   - Consistent type imports
   - Proper naming conventions

3. **Next.js Optimization**
   - Image component usage
   - Font optimization
   - Metadata API implementation

## Common Patterns

### React Component Structure

```typescript
// ✅ Good: Proper typing with TypeScript
interface ButtonProps {
  variant: "primary" | "secondary";
  onClick: () => void;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant,
  onClick,
  children,
}) => {
  return (
    <button onClick={onClick} className={`btn-${variant}`}>
      {children}
    </button>
  );
};

// ❌ Bad: Missing proper types
export const Button = (props) => {
  return <button onClick={props.onClick}>{props.children}</button>;
};
```

### Server Actions

```typescript
// ✅ Good: Server Action with validation
"use server";

import { z } from "zod";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

export async function createUser(formData: FormData) {
  const validated = schema.parse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  // Database operation
  return { success: true };
}
```

### API Route Handlers

```typescript
// ✅ Good: Type-safe API route
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  prNumber: z.number(),
  repo: z.string(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = requestSchema.parse(body);

    // Process request
    return NextResponse.json({ data: validated });
  } catch (error) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}
```

## Reference Files

See the following files for detailed guidelines:

- `resources/typescript-patterns.md` - Advanced TypeScript patterns
- `resources/nextjs-conventions.md` - Next.js App Router conventions
- `resources/performance-tips.md` - Performance optimization guide

## Auto-fix Script

Run the auto-fix script to apply common fixes:

```bash
node .claude/skills/typescript-best-practices/scripts/apply-best-practices.mjs
```

## When to Use This Skill

- During code implementation
- Before committing changes
- In PR reviews
- When refactoring existing code
