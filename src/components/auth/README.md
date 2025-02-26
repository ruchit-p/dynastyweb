# Next.js Authentication Components with Supabase

This directory contains reusable authentication components for Next.js applications using Supabase as the authentication provider. These components are designed to be type-safe, consistent, and easy to integrate into your application.

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

Context provider that manages authentication state and provides auth methods to components.

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

### 5. useAuth Hook

Access authentication state and functions from any component.

```tsx
import { useAuth } from "@/components/auth";

function YourComponent() {
  const { user, signOut, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {user ? (
        <div>
          <p>Welcome, {user.email}!</p>
          <button onClick={signOut}>Sign out</button>
        </div>
      ) : (
        <p>Please sign in</p>
      )}
    </div>
  );
}
```

## Example Implementation

Here's a complete example of how these components can be used together:

```tsx
// src/app/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AuthForm, { LOGIN_FIELDS } from "@/components/auth/AuthForm";
import { signIn } from "@/app/actions/auth";

export default function LoginPage() {
  const router = useRouter();

  const handleSubmit = async (formData: Record<string, string>) => {
    try {
      const result = await signIn({
        email: formData.email,
        password: formData.password
      });
      
      if (result.error) {
        throw result.error;
      }
      
      if (result.user) {
        if (!result.user.email_confirmed_at) {
          router.push('/verify-email');
          return { needsEmailVerification: true };
        } else {
          router.push('/dashboard');
          return { success: true, redirectTo: '/dashboard' };
        }
      }
      
      return { success: true };
    } catch (error) {
      return { 
        error: { 
          message: error instanceof Error ? error.message : 'Failed to login',
        } 
      };
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
            submitButtonText="Sign in"
          />
        </div>
      </div>
    </div>
  );
}
```

## Best Practices

1. **Auth Flow**: Use `AuthForm` for user input, server actions for authentication logic, and Context API for global state.

2. **Protected Routes**: Always use `AuthGuard` to protect routes that require authentication.

3. **User Feedback**: Use toast notifications to give feedback on authentication actions.

4. **Error Handling**: Properly handle and display authentication errors.

5. **Type Safety**: Use TypeScript types provided by the components for better type checking.

6. **Custom Forms**: Extend `AuthForm` with custom fields when needed for your specific auth requirements.

7. **Server Actions**: Use Next.js server actions for authentication logic to keep sensitive operations on the server.

8. **Layout Integration**: Place the `AuthStatus` component in the application layout for consistent authentication UI.

## Customization

These components can be customized through props and CSS classes. For deeper customization, you can modify the components directly or create your own components based on these patterns.

For styling, the components use TailwindCSS, but you can override styles using the `className` prop or by modifying the component files. 