# Library Directory Documentation

## Supabase Integration

### Overview
This directory contains the core library code for Dynasty Web, with a focus on Supabase integration for backend services. The codebase is transitioning from Firebase to Supabase for improved performance and developer experience.

### Directory Structure

```
@lib/
├── server/                # Server-side only code
│   ├── supabase-admin.ts # Admin Supabase client
│   ├── auth-utils.ts     # Server auth helpers
│   └── repositories/     # Data access layer
│       ├── base.ts      # Base repository with common operations
│       ├── users.ts     # User-specific operations
│       ├── stories.ts   # Story-specific operations
│       └── family-tree.ts # Family tree operations
├── client/               # Client-side only code
│   ├── supabase-browser.ts # Browser Supabase client
│   ├── hooks/           # React hooks
│   ├── utils/           # Client utilities
│   └── context/         # React context providers
└── shared/              # Code shared between client and server
    ├── types/           # TypeScript types
    │   └── supabase.ts  # Generated Supabase types
    ├── constants.ts     # Shared constants
    └── validation/      # Zod schemas
        └── schemas.ts   # Validation schemas
```

### Authentication
- User authentication is handled through Supabase Auth
- Supports email/password, social logins, and magic link authentication
- Session management is handled automatically by Supabase

### Database Operations
- All database operations use Supabase's PostgreSQL database
- Real-time subscriptions for live updates
- Row Level Security (RLS) for data access control

### Storage
- Media files are stored in Supabase Storage
- Bucket-based organization for different types of media
- Secure file access through Storage policies

### Edge Functions
- Serverless functions for complex operations
- Secure API endpoints for sensitive operations
- Background jobs and scheduled tasks

### Security
- Row Level Security (RLS) policies for database access
- Storage bucket policies for file access
- Environment variables for sensitive configuration

### Type Safety
- Generated types from Supabase schema
- Type-safe database operations
- Shared types between client and server

### Best Practices
1. Always use type-safe queries
2. Implement proper error handling
3. Use appropriate Supabase clients (browser vs server)
4. Follow security best practices
5. Maintain proper documentation

### Migration Status
- [x] Initial Supabase setup
- [x] Authentication migration
- [x] Database schema migration
- [ ] Storage migration
- [ ] Edge Functions migration
- [ ] Real-time subscriptions
- [ ] Security policies
- [ ] Complete testing

### Environment Setup
Required environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Usage Examples

#### Authentication
```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
})

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})
```

#### Database Operations
```typescript
// Fetch data
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)

// Insert data
const { data, error } = await supabase
  .from('stories')
  .insert([{ title: 'New Story', author_id: userId }])
```

#### Storage Operations
```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('avatars')
  .upload('public/avatar1.png', file)

// Download file
const { data, error } = await supabase.storage
  .from('avatars')
  .download('public/avatar1.png')
```

### Troubleshooting
Common issues and solutions:
1. Authentication errors: Check environment variables and user session
2. Database access denied: Verify RLS policies
3. Storage access issues: Check bucket policies and file permissions

### Contributing
1. Follow type-safe practices
2. Document new features and changes
3. Update migration status
4. Test thoroughly before deployment

### Resources
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase TypeScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

## Usage Guidelines

### Server-Side Code

The `server/` directory contains code that should only be used in server contexts (like Server Components, API routes, etc.). This code may contain sensitive information like service role keys and should never be exposed to the client.

```typescript
// Server-side imports
import { supabaseAdmin } from '@/lib/server/supabase-admin'
import { UserRepository } from '@/lib/server/repositories/users'
import { hasPermission } from '@/lib/server/auth-utils'
```

#### Repositories

The repositories provide a type-safe data access layer with common CRUD operations:

```typescript
// Example repository usage
const userRepo = new UserRepository(supabaseAdmin)
const user = await userRepo.getById('123')
const users = await userRepo.getPaginated(1, 10)
```

### Client-Side Code

The `client/` directory contains code specifically for browser environments. This includes React hooks, browser-specific utilities, and the browser Supabase client.

```typescript
// Client-side imports
import { supabaseBrowser } from '@/lib/client/supabase-browser'
import { useAuth } from '@/components/auth'
import { useStories } from '@/lib/client/hooks/useStories'
```

### Shared Code

The `shared/` directory contains code that is safe to use in both client and server contexts. This includes TypeScript types, constants, and validation schemas.

```typescript
// Shared imports
import { TABLES, ROLES } from '@/lib/shared/constants'
import type { Database } from '@/lib/shared/types/supabase'
import { userSchema } from '@/lib/shared/validation/schemas'
```

## Security Considerations

- Never import from `@/lib/server/*` in client-side code
- Keep sensitive operations and keys in server-side code
- Use appropriate error handling and validation
- Follow rate limiting guidelines for API operations
- Always use the appropriate Supabase client:
  - `supabaseAdmin` for server-side operations
  - `supabaseBrowser` for client-side operations

## Error Handling

The codebase uses a consistent error handling approach:

- Repositories throw typed errors that can be caught and handled
- Client-side hooks include error states and error handling
- Validation errors are handled through Zod schemas
- All errors are properly logged for debugging

## Type Safety

All Supabase operations are typed using the generated types from your database schema:

- Use `Database` type for Supabase client typing
- Use table-specific types for operations (Insert, Update, etc.)
- Keep types up to date by running type generation when schema changes
- Use Zod schemas for runtime validation

## Development Guidelines

1. Use repositories for all database operations
2. Validate all inputs with Zod schemas
3. Handle errors appropriately at each layer
4. Keep sensitive operations server-side
5. Use appropriate client/server code separation 