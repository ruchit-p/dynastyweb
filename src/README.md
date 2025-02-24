# Source Directory Structure

This directory contains the main source code for the Dynasty Web application, organized by functionality and context.

## Directory Structure

```
src/
├── app/                    # Next.js app directory
│   ├── (protected)/           # Authentication routes
│   ├── (dashboard)/      # Dashboard routes
│   ├── api/              # API routes
│   └── layout.tsx        # Root layout
├── components/            # React components
│   ├── ui/              # UI components
│   ├── forms/           # Form components
│   └── features/        # Feature-specific components
├── lib/                   # Library code (see lib/README.md)
│   ├── server/          # Server-side code
│   ├── client/          # Client-side code
│   └── shared/          # Shared code
├── data/                  # Static data and content
└── middleware.ts         # Next.js middleware

## Component Organization

### UI Components
Reusable UI components are organized under `components/ui/`:
- Basic elements (buttons, inputs, etc.)
- Layout components
- Feedback components (alerts, toasts)

### Form Components
Form-related components under `components/forms/`:
- Form fields and inputs
- Form validation
- Form submission handlers

### Feature Components
Feature-specific components under `components/features/`:
- Story components
- Family tree components
- User profile components

## App Directory Structure

The app directory follows Next.js 13+ conventions:
- Route groups in parentheses
- API routes under api/
- Layouts for route groups
- Loading and error states

## Library Code

The `lib/` directory is organized into three main sections:
- `server/`: Server-side code (repositories, auth, admin operations)
- `client/`: Client-side code (hooks, contexts, browser utilities)
- `shared/`: Shared code (types, constants, validation)

See `lib/README.md` for detailed documentation.

## Development Guidelines

### Component Development
1. Use server components by default
2. Mark client components with 'use client'
3. Keep components focused and single-responsibility
4. Use proper TypeScript types
5. Include proper error boundaries

### Data Fetching
1. Use repositories for database operations
2. Handle loading and error states
3. Implement proper caching strategies
4. Use appropriate Supabase client

### Form Handling
1. Use Zod for validation
2. Implement proper error handling
3. Show appropriate feedback
4. Use proper TypeScript types

### Security
1. Keep sensitive operations server-side
2. Validate all inputs
3. Implement proper rate limiting
4. Follow authentication best practices

### Performance
1. Use proper code splitting
2. Implement proper caching
3. Optimize images and assets
4. Monitor and optimize bundle size

## Testing

The codebase includes:
1. Unit tests for utilities
2. Component tests
3. Integration tests
4. E2E tests with Playwright

## State Management

1. Use React Context for global state
2. Use hooks for component state
3. Use server state when appropriate
4. Implement proper caching

## Error Handling

1. Use error boundaries
2. Implement proper logging
3. Show user-friendly errors
4. Handle edge cases

## Styling

1. Use Tailwind CSS
2. Follow design system
3. Implement proper dark mode
4. Ensure accessibility

## Documentation

Keep documentation up to date:
1. Component documentation
2. API documentation
3. Type documentation
4. README files 