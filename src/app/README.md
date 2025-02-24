# App Directory Documentation

## Overview

This directory contains the Next.js app router pages and server components. The application uses Supabase for authentication, data storage, and real-time features.

## Directory Structure

```
app/
├── actions/              # Server actions
│   ├── auth.ts          # Authentication actions
│   ├── family-tree.ts   # Family tree operations
│   ├── stories.ts       # Story management
│   └── users.ts         # User management
├── (protected)/         # Protected routes (requires auth)
├── verify-email/        # Email verification
├── login/              # Authentication pages
├── signup/
└── forgot-password/
```

## Authentication Flow

The application uses Supabase Authentication with the following flow:

1. **Sign Up**
   - User fills out registration form
   - Supabase creates auth user and profile
   - Verification email is sent
   - User is redirected to email verification page

2. **Email Verification**
   - User clicks verification link in email
   - Email is verified in Supabase
   - User is redirected to family tree page

3. **Sign In**
   - User enters credentials
   - Supabase validates credentials
   - User is redirected based on email verification status

4. **Password Reset**
   - User requests password reset
   - Reset email is sent via Supabase
   - User follows link to reset password

## Server Actions

Server actions are used for secure server-side operations:

### Authentication Actions
```typescript
// Sign up new user
async function signUp(formData: FormData): Promise<ActionResult>

// Sign in existing user
async function signIn(formData: FormData): Promise<ActionResult>

// Sign out user
async function signOut(): Promise<ActionResult>

// Reset password
async function resetPassword(formData: FormData): Promise<ActionResult>
```

### Protected Routes

Protected routes are wrapped with authentication checks:

```typescript
// Example protected route
export default async function ProtectedPage() {
  const supabase = createServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    redirect('/login')
  }
  
  return <ProtectedContent />
}
```

## Form Validation

All forms use Zod schemas for validation:

```typescript
// Example validation schema
const loginFormSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters')
})
```

## Error Handling

Consistent error handling across all pages:

1. Form validation errors
2. Authentication errors
3. Server action errors
4. Network errors

## State Management

Client-side state is managed through:

1. React state for form data
2. Supabase auth state
3. Context providers where needed

## Real-time Features

Supabase real-time subscriptions are used for:

1. Authentication state changes
2. Family tree updates
3. Story notifications

## Environment Variables

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_APP_URL=your_app_url
```

## Security Considerations

1. All sensitive operations use server actions
2. Protected routes enforce authentication
3. Form data is validated server-side
4. Proper error handling and rate limiting

## Development Guidelines

1. Use server components by default
2. Client components must use 'use client' directive
3. Keep forms controlled and validated
4. Handle loading and error states
5. Use proper TypeScript types

## Testing

Components should be tested for:

1. Form validation
2. Authentication flows
3. Protected route access
4. Error handling
5. Loading states

## Styling

The application uses:

1. Tailwind CSS for styling
2. Shadcn UI components
3. Custom theme variables
4. Responsive design

## Performance

Optimizations include:

1. Server components
2. Proper image optimization
3. Loading states
4. Error boundaries

## Accessibility

Ensure:

1. Proper ARIA labels
2. Keyboard navigation
3. Color contrast
4. Screen reader support

## Contributing

1. Follow TypeScript best practices
2. Use server actions for data mutations
3. Validate all inputs
4. Handle errors appropriately
5. Update documentation

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Shadcn UI](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com) 