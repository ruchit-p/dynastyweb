# Server-Side Actions and Security Rules

## Core Principles

### 1. Server-Side First
- All database operations MUST be performed on the server side
- Use Next.js Server Actions for mutations
- Use Route Handlers for complex queries
- No direct database calls from the client

### 2. Authentication & Authorization
- Implement role-based access control (RBAC)
- Validate all user permissions server-side
- Never trust client-side authorization checks
- Use middleware for protected routes

### 3. Data Access Patterns
- Create typed server actions using `"use server"`
- Implement repository pattern for database access
- Use zod for input validation
- Return minimal necessary data to client

### 4. Security Best Practices
- Sanitize all inputs
- Implement rate limiting
- Use CSRF protection
- Keep sensitive data server-side
- Implement proper error handling
- Use environment variables for secrets

### 5. Email Templates
- Use Supabase Email Templates for all transactional emails
- Configure templates in Supabase Dashboard
- Never use external email providers (e.g., SendGrid)
- Available template types:
  - `signup`: New user registration
  - `magiclink`: Magic link authentication
  - `invite`: Team/family invitations
  - `reset`: Password reset
  - `change_email`: Email change confirmation
  - `confirm_email`: Email verification

## Implementation Guidelines

### Email Template Configuration
```typescript
// Configure in Supabase Dashboard and use in code
const { error } = await supabase.auth.signUp({
  email,
  password,
  options: {
    emailRedirectTo: `${origin}/auth/callback`,
    data: {
      // Custom data for email template
      first_name: firstName,
      last_name: lastName,
    },
  },
})

// For password reset
const { error } = await supabase.auth.resetPasswordForEmail(email, {
  redirectTo: `${origin}/auth/reset-password`,
})

// For email change
const { error } = await supabase.auth.updateUser({
  email: newEmail,
})
```

### Server Actions Structure
```typescript
// app/actions/auth.ts
"use server"

import { z } from "zod"
import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

const inputSchema = z.object({
  // Define schema
})

export async function serverAction(input: z.infer<typeof inputSchema>) {
  // 1. Validate input
  const validated = inputSchema.parse(input)
  
  // 2. Get server-side supabase client
  const supabase = createServerClient(cookies())
  
  // 3. Perform action
  try {
    // Logic here
  } catch (error) {
    // Error handling
  }
}
```

### API Route Structure
```typescript
// app/api/resource/route.ts
import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

export async function GET(request: Request) {
  const supabase = createServerClient(cookies())
  
  try {
    // Logic here
  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    )
  }
}
```

### Client-Side Usage
```typescript
// Components should use server actions
"use client"

import { serverAction } from "@/app/actions/auth"

export function Component() {
  async function handleAction() {
    const result = await serverAction({
      // Input data
    })
  }
}
```

## Security Checklist

### For Each Server Action
- [ ] Input validation with zod
- [ ] Authorization check
- [ ] Error handling
- [ ] Rate limiting where necessary
- [ ] Audit logging for sensitive operations
- [ ] Return minimal necessary data

### For Protected Routes
- [ ] Middleware authentication
- [ ] Role-based access control
- [ ] Session validation
- [ ] CSRF protection

### For Email Templates
- [ ] Configure all required templates in Supabase
- [ ] Test email delivery in development
- [ ] Verify email template variables
- [ ] Set up proper redirect URLs
- [ ] Handle email errors gracefully
- [ ] Monitor email delivery status

## File Structure
```
app/
  actions/
    auth.ts
    users.ts
    stories.ts
    family-tree.ts
  api/
    [resource]/
      route.ts
lib/
  supabase/
    server.ts
    types.ts
    email-templates.ts  # Email template configurations
  repositories/
    users.ts
    stories.ts
    family-tree.ts
  validation/
    schemas.ts
middleware.ts
```

## Error Handling
- Use custom error classes
- Never expose internal errors to client
- Log errors properly
- Return appropriate status codes

## Monitoring
- Log security-relevant events
- Track performance metrics
- Monitor error rates
- Set up alerts for suspicious activity
- Monitor email delivery rates and failures