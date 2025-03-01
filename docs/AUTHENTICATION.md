# Authentication System Documentation

This document provides a comprehensive overview of the Dynasty Web application's authentication system, explaining the components, their interactions, and best practices for usage.

## Overview

The Dynasty Web authentication system is built on Supabase Auth with a modern architecture using the App Router in Next.js 14+. It implements:

- **Server-side auth checks** via middleware
- **Client-side auth management** via AuthContext
- **Edge Functions** for auth-related business logic
- **Email verification** workflow
- **Password reset** functionality
- **Protected routes** with automatic redirects

## Key Components

### 1. Server-Side Authentication

#### Middleware (`src/middleware.ts`)

The middleware protects routes by checking authentication status server-side before rendering pages. It:

- Checks for valid sessions
- Verifies email confirmation
- Redirects unauthenticated users to login
- Redirects authenticated users away from auth pages
- Manages redirects for email verification

```typescript
// Protected routes requiring authentication
const PROTECTED_ROUTES = ['/family-tree', '/history-book', /* etc */]
```

### 2. Supabase Client Setup

#### Browser Client (`src/lib/supabase.ts` and `src/lib/client/supabase-browser.ts`)

Two client creation patterns:

1. **Function-based**: `createClient()` for creating new instances
2. **Singleton**: `supabaseBrowser` for reusing the same instance across components

```typescript
// Import appropriate client based on usage context
import { createClient } from '@/lib/supabase' // For new instances
import { supabaseBrowser } from '@/lib/client/supabase-browser' // For singleton
```

### 3. Client-Side Authentication

#### Auth Context (`src/components/auth/AuthContext.tsx`)

Provides authentication state and methods to all components through React Context:

- User session management
- Login/logout functionality
- Registration with/without invitation
- Password reset
- Event listening for auth state changes

```typescript
// Usage in components
const { currentUser, loading, login, logout } = useAuth()
```

#### AuthGuard (`src/components/auth/AuthGuard.tsx`)

Client-side route protection component that:

- Checks authentication status
- Redirects unauthenticated users
- Shows loading states
- Verifies email confirmation
- Handles redirect back to original page after login

```typescript
// Wrap protected content
<AuthGuard>
  <ProtectedContent />
</AuthGuard>
```

#### AuthGuard Configuration Options

`AuthGuard` can be configured with the following props:

```typescript
<AuthGuard
  // Whether to require email verification
  requiredVerification={true}
  
  // Whether to show loading state while checking auth
  showLoading={true}
  
  // Use AuthContext for verification
  verifyWithContext={true}
>
  <YourProtectedContent />
</AuthGuard>
```

### 4. Edge Functions for Auth

#### Auth Service (`src/lib/client/services/auth.ts`)

Client-side service that communicates with Edge Functions:

- Provides clean APIs for auth operations
- Handles errors consistently
- Logs auth-related events

```typescript
// Usage example
const result = await authService.signIn({ email, password });
```

#### Auth Edge Function (`supabase/functions/auth/index.ts`)

Server-side implementation of auth logic:

- User registration
- Login authentication
- Profile creation
- Email verification
- Password reset

### 5. Auth UI Components

#### AuthForm (`src/components/auth/AuthForm.tsx`)

Reusable authentication form that handles:

- Login forms
- Signup forms
- Password reset
- Form validation
- Error display

```typescript
<AuthForm
  fields={LOGIN_FIELDS}
  onSubmit={handleLogin}
  submitButtonText="Sign In"
  footer={<LoginFormFooter />}
/>
```

#### AuthStatus (`src/components/auth/AuthStatus.tsx`)

UI component showing authentication status with:

- User email display
- Sign-out button
- Login button when not authenticated

## Authentication Flow

### Registration Flow

1. User enters registration details on `/signup` page
2. Client sends data to Edge Function via `authService.signUp()`
3. Edge Function creates user in Supabase Auth
4. User receives email verification link
5. User is redirected to `/verify-email` page
6. User clicks verification link in email
7. Auth callback processes verification and redirects to app

### Login Flow

1. User enters credentials on `/login` page
2. Client sends data to Edge Function via `authService.signIn()`
3. Edge Function authenticates with Supabase Auth
4. Session is established with cookies
5. AuthContext updates with user information
6. User is redirected to protected area

### Protected Route Access

1. User attempts to access protected route
2. Middleware checks for valid session
3. If authenticated, page renders
4. If not authenticated, redirects to login
5. After login, redirects back to originally requested page

## Best Practices

### 1. Authentication Checks

Use the appropriate auth check based on the context:

- **Server Components**: Use `createClient()` from `@/lib/supabase` and check session
- **Client Components**: Use `useAuth()` hook from AuthContext
- **Route Protection**: Use `AuthGuard` component or middleware

### 2. Error Handling

Handle authentication errors consistently:

- Display user-friendly error messages
- Log detailed errors for debugging
- Redirect to appropriate pages on auth failures

### 3. Session Management

- Don't store sensitive auth data in localStorage
- Rely on HTTP-only cookies for session persistence
- Use Supabase's built-in token refresh mechanism

### 4. Component Usage

```tsx
// Protect a client component
'use client'

import { useAuth } from '@/components/auth'
import { AuthGuard } from '@/components/auth'

function ProtectedFeature() {
  return (
    <AuthGuard>
      <YourProtectedComponent />
    </AuthGuard>
  )
}

// Get auth status in a component
function ProfileButton() {
  const { currentUser, logout } = useAuth()
  
  if (!currentUser) return null
  
  return (
    <button onClick={logout}>Sign Out</button>
  )
}
```

## Troubleshooting

### Common Issues

1. **"Authentication required" errors**
   - Check if session cookies are being properly set
   - Verify middleware is configured correctly
   - Check for CORS issues with Edge Functions

2. **Session not persisting**
   - Ensure correct cookie handling in middleware
   - Verify you're using the `@supabase/ssr` package
   - Check for cookie same-site/secure settings

3. **Edge Function errors**
   - Check browser console and server logs
   - Verify proper CORS configuration
   - Check for proper error handling

## Security Considerations

1. **Always validate auth server-side** - Don't rely solely on client-side checks
2. **Use HTTP-only cookies** - Prevent XSS attacks
3. **Implement proper CORS** - Prevent CSRF attacks
4. **Rate limit auth attempts** - Prevent brute force
5. **Require email verification** - Validate user identity 

## Migration from ProtectedRoute to AuthGuard

The `ProtectedRoute` component has been deprecated in favor of the enhanced `AuthGuard` component. All code should now use `AuthGuard` exclusively for route protection.

### AuthGuard Advantages

- More comprehensive error handling
- Configurable email verification requirements
- Better loading state management
- Stronger typing
- Integration with AuthContext for more consistent behavior

### Example Migration

Before:
```tsx
import ProtectedRoute from '@/components/ProtectedRoute'

function ProtectedPage() {
  return (
    <ProtectedRoute>
      <YourContent />
    </ProtectedRoute>
  )
}
```

After:
```tsx
import { AuthGuard } from '@/components/auth'

function ProtectedPage() {
  return (
    <AuthGuard>
      <YourContent />
    </AuthGuard>
  )
}
``` 