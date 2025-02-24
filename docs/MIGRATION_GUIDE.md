# Firebase to Supabase Migration Guide

## Overview
This document outlines the process of migrating the Dynasty Web application from Firebase to Supabase. The migration includes authentication, database, storage, and real-time functionality.

## Migration Status

### Core Utilities
- [x] Authentication (auth context and hooks)
- [x] Database Schema
- [x] Storage Configuration
- [x] `functionUtils.ts` - Converted to Supabase Edge Functions
- [x] `settingsManager.ts` - Converted to Supabase operations
- [x] `storyUtils.ts` - Converted to Supabase queries

### Components
- [x] `ChangePasswordDialog.tsx` - Auth operations
- [x] `Story.tsx` - Database operations
- [x] `Navbar.tsx` - Auth and database operations
- [x] `FamilyMemberSelect.tsx` - Database operations

### Pages
- [x] `story/[id]/page.tsx` - Database operations
- [x] `story/[id]/edit/page.tsx` - Database operations
- [x] `layout.tsx` - Auth operations
- [x] `verify-email/confirm/page.tsx` - Edge functions

## Migration Steps

### 1. Core Utilities Migration

#### Function Utilities
- Replace Firebase Cloud Functions with Supabase Edge Functions
- Update function calling mechanism
- Update type definitions
- Add proper error handling

#### Settings Manager
- Convert Firestore operations to Supabase database operations
- Update timestamp handling
- Update real-time subscription methods

#### Story Utils
- Convert Firestore queries to Supabase queries
- Update data types and interfaces
- Implement equivalent filtering and sorting

### 2. Component Migration

#### Authentication Components
- Update auth method imports
- Convert Firebase Auth methods to Supabase Auth
- Update error handling and types

#### Database Components
- Replace Firestore operations with Supabase operations
- Update real-time subscriptions
- Convert timestamps and data types

### 3. Page Migration
- Update data fetching methods
- Convert server-side operations
- Update authentication checks
- Implement proper error handling

## Type Conversions

### Firebase to Supabase Type Mappings
```typescript
// Firebase Types -> Supabase Types
Timestamp -> string (ISO date string)
DocumentReference -> string (UUID)
CollectionReference -> Table name
Query -> PostgreSQL query
```

### Authentication
```typescript
// Firebase Auth -> Supabase Auth
User -> User
AuthError -> AuthError
AuthCredential -> Provider
```

### Database
```typescript
// Firestore -> Supabase
DocumentData -> Database['public']['Tables']['table_name']['Row']
QuerySnapshot -> PostgrestResponse
DocumentSnapshot -> PostgrestSingleResponse
```

## Testing Migration

### Unit Tests
- Update test utilities
- Convert Firebase mocks to Supabase mocks
- Update assertion methods

### Integration Tests
- Update API calls
- Convert Firebase emulator tests to Supabase local testing
- Update environment variables

## Environment Updates

### Development
```env
# Remove Firebase variables
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
# Add Supabase variables
+ NEXT_PUBLIC_SUPABASE_URL
+ NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Production
- Update deployment configuration
- Update environment variables
- Update security rules and policies

## Cleanup Steps
1. Remove Firebase dependencies
2. Remove Firebase configuration files
3. Update README and documentation
4. Remove Firebase-specific environment variables
5. Clean up unused imports and types

## Rollback Plan
In case of migration issues:
1. Keep Firebase code in separate branches
2. Maintain dual configurations temporarily
3. Document rollback procedures
4. Keep backup of Firebase configuration

## Post-Migration Tasks
1. Update deployment scripts
2. Update CI/CD pipelines
3. Update monitoring and logging
4. Update backup procedures
5. Train team on Supabase tools and dashboard

## Resources
- [Supabase Documentation](https://supabase.io/docs)
- [Supabase JavaScript Client](https://supabase.io/docs/reference/javascript/introduction)
- [Supabase Edge Functions](https://supabase.io/docs/guides/functions)
- [Supabase Migration Guides](https://supabase.io/docs/guides/migrations) 