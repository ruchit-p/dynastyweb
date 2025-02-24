# Supabase Environment Setup Guide

## Overview
This document outlines the setup and usage of development and production environments for the Dynasty web application. The system uses Supabase for both local development and production environments.

## Table of Contents
- [Environment Configuration](#environment-configuration)
- [Development Environment](#development-environment)
- [Production Environment](#production-environment)
- [Available Scripts](#available-scripts)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Environment Configuration

### Development (.env.development)
```env
# Supabase Development Configuration
NEXT_PUBLIC_SUPABASE_URL=your-dev-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-role-key
# ... additional configuration
```

### Production (.env.production)
```env
# Supabase Production Configuration
NEXT_PUBLIC_SUPABASE_URL=your-prod-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-prod-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-prod-service-role-key
# ... additional configuration
```

## Development Environment

### Setup
1. Create a local environment file:
   ```bash
   cp .env.development .env.local
   ```

2. Update `.env.local` with your Supabase development configuration

3. Start the development environment:
   ```bash
   npm run dev
   ```

### Features
- Local Next.js development server
- Hot reloading
- Connection to Supabase development project
- Database migrations and seeding
- Edge Functions development

## Production Environment

### Setup
1. Ensure `.env.production` is configured with production Supabase credentials
2. Build the application:
   ```bash
   npm run build
   ```
3. Start the production server:
   ```bash
   npm run start
   ```

### Features
- Connects to production Supabase project
- Production-optimized build
- Analytics enabled
- Edge Functions deployment

## Available Scripts

### Development
- `npm run dev`: Start Next.js development server
- `npm run db:migrate`: Run database migrations
- `npm run db:seed`: Seed the database with test data
- `npm run edge:dev`: Start Edge Functions development server

### Production
- `npm run build`: Create production build
- `npm run start`: Start production server
- `npm run lint`: Run linting checks
- `npm run edge:deploy`: Deploy Edge Functions

## Best Practices

### Version Control
- Add `.env.local`, `.env.development`, and `.env.production` to `.gitignore`
- Maintain an `.env.example` file in version control
- Never commit actual Supabase credentials

### Development Workflow
1. Use a development Supabase project for local work
2. Run migrations before starting development
3. Test thoroughly in development before deploying
4. Use different Supabase projects for development and production

### Security
- Keep production credentials secure
- Don't share development credentials unnecessarily
- Regularly rotate API keys
- Use appropriate Row Level Security (RLS) policies

## Troubleshooting

### Common Issues

1. **Database Connection Issues**
   - Verify environment variables are set correctly
   - Check console for connection errors
   - Ensure your IP is allowed in Supabase dashboard

2. **Authentication Problems**
   - Verify Supabase URL and anon key
   - Check email provider settings in Supabase dashboard
   - Review authentication logs in Supabase dashboard

3. **Edge Functions Issues**
   - Verify Edge Functions are deployed
   - Check function logs in Supabase dashboard
   - Ensure correct environment variables are set

### Debug Mode
Enable debug logging by adding to your code:
```typescript
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Environment:', process.env.NODE_ENV);
}
```

## Supabase Configuration

### Service Integration
The application automatically connects to Supabase services:

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)
```

### Analytics
Analytics is handled through Supabase's built-in analytics features:
```typescript
// No additional setup required - analytics are available in the Supabase dashboard
``` 