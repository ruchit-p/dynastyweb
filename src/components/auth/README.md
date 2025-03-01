# Next.js Authentication Components with Supabase

This directory contains reusable authentication components for Next.js applications using Supabase as the authentication provider. These components are designed to be type-safe, consistent, and easy to integrate into your application.

## Key Features

- **Automatic Session Management**: Uses `@supabase/ssr` package to handle session persistence automatically without manual localStorage management
- **Type-Safe Authentication**: Fully typed components and hooks for better developer experience
- **Client & Server Components**: Built to work with Next.js App Router architecture
- **Comprehensive Error Handling**: Structured error responses and user feedback

## Components Overview

### 1. AuthGuard

Protects routes requiring authentication. Redirects unauthenticated users to the login page.

```tsx
// Example usage in a page
import { AuthGuard } from "@/components/auth";

export default function ProtectedPage() {
  return (
    <AuthGuard>
      <YourProtectedContent />
    </AuthGuard>
  );
}
```

#### Configuration Options

`AuthGuard` can be configured with these props:

```tsx
<AuthGuard
  requiredVerification={true} // Whether email verification is required
  fallbackUrl='/login' // Where to redirect if not authenticated
  showLoading={true} // Whether to show loading state while checking auth
  verifyWithContext={true} // Use AuthContext for verification
>
  <YourProtectedContent />
</AuthGuard>
```

### 2. AuthStatus

Displays the current user's authentication status and provides sign-out functionality.

```tsx
import { AuthStatus } from "@/components/auth";

// Basic usage
<AuthStatus />

// With customization options
<AuthStatus 
  className="my-custom-class" 
  showSignOut={false}
  showEmail={true}
  hideWhenNotAuthenticated={true}
/>
```

#### Props:

- `className`: Optional custom CSS class
- `showSignOut`: Whether to show sign-out button (default: true)
- `showEmail`: Whether to show user's email (default: true)
- `hideWhenNotAuthenticated`: Whether to hide when user is not authenticated (default: false)

### 3. AuthForm

A reusable form component for login, signup, forgot password, etc.

```tsx
import AuthForm, { LOGIN_FIELDS, SIGNUP_FIELDS } from "@/components/auth/AuthForm";

// Login form
<AuthForm
  fields={LOGIN_FIELDS}
  onSubmit={handleLogin}
  submitButtonText="Sign in"
  footer={<YourCustomFooter />}
/>

// Signup form
<AuthForm
  fields={SIGNUP_FIELDS}
  onSubmit={handleSignup}
  submitButtonText="Create account"
  redirectPath="/dashboard"
/>

// Custom fields
const CUSTOM_FIELDS = [
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    required: true,
    autoComplete: 'email'
  },
  // Add more fields as needed
];

<AuthForm
  fields={CUSTOM_FIELDS}
  onSubmit={handleSubmit}
  submitButtonText="Submit"
/>
```

#### Props:

- `fields`: Array of field configurations for the form
- `onSubmit`: Function to handle form submission - returns a Promise with the auth response
- `submitButtonText`: Text for the submit button
- `className`: Optional custom CSS class
- `redirectPath`: Path to redirect to after successful form submission
- `footer`: Optional React node for form footer content
- `initialValues`: Optional initial values for form fields

### 4. AuthProvider

Context provider that manages authentication state and provides auth methods to components. Uses the `@supabase/ssr` package to handle session persistence automatically.

```tsx
// In your layout.tsx
import { AuthProvider } from "@/components/auth";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

The AuthProvider now:
- Initializes a Supabase client using the SSR package
- Manages session state automatically without requiring localStorage
- Handles auth state changes via Supabase's onAuthStateChange API
- Provides typed access to the current user, session and auth methods

### 5. useAuth Hook

Access authentication state and functions from any component.

```tsx
import { useAuth } from "@/components/auth";

function YourComponent() {
  const { currentUser, loading, logout } = useAuth();
  
  if (loading) return <div>Loading...</div>;
  
  return (
    <div>
      {currentUser ? (
        <div>
          <p>Welcome, {currentUser.email}!</p>
          <button onClick={logout}>Sign out</button>
        </div>
      ) : (
        <p>Please sign in</p>
      )}
    </div>
  );
}
```

The hook provides:
- `currentUser`: The authenticated user object (or null)
- `session`: The current Supabase session (or null)
- `loading`: Boolean indicating if auth state is being loaded
- Auth methods: `login`, `logout`, `signUp`, `resetPassword`, etc.

## Authentication Flow

1. **Login Process**:
   - User submits credentials via AuthForm
   - AuthContext's login method is called
   - Supabase authenticates the user
   - Session is automatically persisted via the SSR package
   - User is redirected to the appropriate page (handling URL redirect parameters)

2. **Session Management**:
   - The `@supabase/ssr` package handles cookie-based session persistence
   - No manual localStorage management is required
   - Auth state is kept in sync via onAuthStateChange listeners

3. **Protected Routes**:
   - AuthGuard checks for valid session
   - Unauthenticated users are redirected to login with the current path as a redirect parameter
   - Email verification status is checked and appropriate notifications are shown

## Example Implementation

Here's a complete example of how these components can be used together:

```tsx
// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AuthForm, { LOGIN_FIELDS } from "@/components/auth/AuthForm";
import { useAuth } from "@/components/auth";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: Record<string, string>) => {
    setIsLoading(true);
    try {
      await login({
        email: formData.email,
        password: formData.password
      });
      
      // Redirect is handled by the login method which considers URL parameters
      return { success: true };
    } catch (error) {
      return { 
        error: { 
          message: error instanceof Error ? error.message : 'Failed to login',
        } 
      };
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center">
      <div className="mx-auto w-full max-w-md">
        <Image src="/logo.png" alt="Logo" width={60} height={60} className="mx-auto" />
        <h2 className="mt-6 text-center text-3xl font-bold">Sign in</h2>
        
        <div className="mt-8 bg-white p-8 rounded-lg shadow">
          <AuthForm
            fields={LOGIN_FIELDS}
            onSubmit={handleSubmit}
            submitButtonText={isLoading ? "Signing in..." : "Sign in"}
            isSubmitting={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
```

## Best Practices

1. **Use SSR Package**: Leverage `@supabase/ssr` for automatic session management instead of manual localStorage handling.
2. **Protected Routes**: Always use `AuthGuard` to protect routes that require authentication.
3. **User Feedback**: Use toast notifications to give feedback on authentication actions.
4. **Error Handling**: Properly handle and display authentication errors with structured responses.
5. **Type Safety**: Utilize TypeScript interfaces for all auth-related data.
6. **Custom Forms**: Extend `AuthForm` with custom fields when needed for your specific auth requirements.

## Customization

These components can be customized through props and CSS classes. For deeper customization, you can modify the components directly or create your own components based on these patterns.

For styling, the components use TailwindCSS, but you can override styles using the `className` prop or by modifying the component files. 