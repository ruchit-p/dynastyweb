# Dynasty Web Application Deployment Guide

## Environment Setup

This application is configured to run in both development and production environments.

### Environment Files

- `.env.development` - Used for local development
- `.env.production` - Used for production deployment
- `.env.local` - Local overrides (not committed to version control)

### Switching Between Environments

The application includes scripts to easily switch between local and production Supabase:

```bash
# Switch to local Supabase
npm run env:local

# Switch to production Supabase
npm run env:prod
```

After switching environments, restart your development server:

```bash
npm run dev
```

## Local Development

1. Start the development server:

```bash
npm run dev
```

2. To simulate production environment locally:

```bash
npm run dev:prod
```

3. Database operations:

```bash
# Start Supabase locally
npm run supabase:start

# Generate TypeScript types from the database
npm run db:types

# Reset the local database
npm run db:reset
```

## Production Deployment

### Deploying to Vercel

1. Push your code to the GitHub repository.

2. Connect your repository to Vercel:
   - Log in to Vercel Dashboard
   - Click "Add New Project"
   - Import your Git repository
   - Configure project settings:
     - Framework Preset: Next.js
     - Build Command: `npm run build`
     - Output Directory: `.next`
     - Environment Variables: Copy from `.env.production`

3. Set up custom domain:
   - Go to Project Settings > Domains
   - Add domain: `mydynastyapp.com`
   - Verify ownership and configure DNS settings

### Continuous Deployment

The repository is configured for continuous deployment:
- Pushing to `main` branch will trigger a production deployment
- Pushing to `staging` branch will trigger a staging deployment

### Environment Variables

Ensure the following environment variables are properly set in the Vercel dashboard:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-supabase-anon-key>
NEXT_PUBLIC_APP_URL=https://mydynastyapp.com
```

## Monitoring and Error Tracking

### Sentry Integration

This application uses Sentry for error tracking. The DSN and configuration are already set up in:
- `sentry.client.config.ts`
- `sentry.server.config.ts`
- `sentry.edge.config.ts`

### Logs

Production logs can be viewed in the Vercel dashboard under "Logs".

## Manual Deployment

If you need to manually deploy:

```bash
# Build for production
npm run build

# Start production server
npm run start:prod
```

## Troubleshooting

1. **Build failures**: Check Vercel build logs for detailed error messages
2. **API errors**: Check Sentry for captured exceptions
3. **Database issues**: Verify Supabase connection credentials
4. **Environment variables**: Ensure all required variables are set in Vercel

## Performance Optimization

To analyze bundle size:

```bash
npm run build:analyze
```

## Rollback Procedure

To rollback to a previous deployment:
1. Go to Vercel Dashboard > Deployments
2. Find the stable deployment
3. Click "..." > "Promote to Production"