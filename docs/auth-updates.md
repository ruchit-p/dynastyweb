# Supabase Auth Updates

This document details the changes made to update the Supabase authentication implementation in the project.

## Background

Supabase released [a new authentication approach for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) which moves away from the deprecated `@supabase/auth-helpers-nextjs` package to the new `@supabase/ssr` package. The new approach provides a more streamlined authentication flow and better typing support.

## Changes Made

### 1. Updated Client Instantiation

- Created a centralized Supabase client creation in `src/lib/client/supabase.ts` for browser client-side usage
- Created a centralized Supabase client creation in `src/lib/server/supabase.ts` for server-side usage

### 2. Updated Pages and Components

The following files were updated to use the new client instantiation methods:

- `src/app/verify-email/confirm/page.tsx` - Updated to use `supabaseBrowser`
- `src/lib/client/utils/mediaUtils.ts` - Updated to use `supabaseBrowser`
- `src/lib/client/hooks/useStories.ts` - Updated to use `supabaseBrowser`
- `src/app/api/family-tree/route.ts` - Updated to use server client with correct cookie handling
- `src/app/actions/stories.ts` - Updated to use server client with correct auth handling
- `src/app/actions/auth.ts` - Added `getUserId` helper function

### 3. Created Shared Types

- `src/lib/shared/types/story.ts` - Created shared types for stories to be used in both client and server

## Next Steps

1. Continue to update any remaining files using the deprecated `@supabase/auth-helpers-nextjs` package
2. Remove the deprecated package from `package.json` once all instances are updated
3. Ensure all components properly handle authentication state and loading states

## Testing

- Verify that users can sign in and sign up
- Verify that authenticated routes properly restrict access
- Verify that user data is properly displayed in authenticated components
- Ensure family trees are created upon signup
- Ensure that history books are properly associated with users

## References

- [Supabase Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase SSR Documentation](https://supabase.com/docs/guides/auth/server-side-rendering) 