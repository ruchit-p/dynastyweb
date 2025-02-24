# Firebase to Supabase Migration

This directory contains scripts and utilities for migrating data from Firebase to Supabase.

## Overview

The migration process involves:
1. Setting up Supabase storage buckets and policies
2. Migrating files from Firebase Storage to Supabase Storage
3. Updating database records with new file URLs

## Prerequisites

1. Firebase Admin SDK credentials
2. Supabase project credentials
3. Node.js 18+
4. Yarn or npm

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
# Firebase
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Storage Migration

### 1. Create Storage Buckets

First, run the storage SQL script to create buckets and policies:

```bash
psql -h your_supabase_host -d postgres -U postgres -f supabase/storage.sql
```

Or copy the contents of `supabase/storage.sql` and run them in the Supabase SQL editor.

### 2. Run Migration Script

```bash
# Install dependencies
yarn install

# Run migration script
yarn ts-node scripts/migrate-firebase.ts
```

The script will:
- Migrate profile pictures
- Migrate story media files
- Migrate family tree documents
- Update database records with new URLs

## Migration Progress

The script provides detailed progress information:
- Total files to migrate
- Successfully migrated files
- Failed migrations
- Skipped files

Example output:
```
Starting Firebase to Supabase migration...
Starting profile pictures migration...
Found 100 users with profile pictures
Profile pictures migration complete: { total: 100, success: 95, failed: 2, skipped: 3 }
...
```

## Error Handling

The script includes comprehensive error handling:
- Validates file existence before migration
- Handles network errors
- Provides detailed error logs
- Cleans up partial uploads on failure

## Post-Migration

After migration:
1. Verify file counts match
2. Check file accessibility
3. Update application code to use new URLs
4. Test file operations in the application

## Rollback

To rollback the migration:
1. Keep Firebase storage active
2. Empty Supabase storage buckets
3. Revert database URL updates

## Troubleshooting

Common issues and solutions:

1. **File Not Found**
   - Check Firebase file paths
   - Verify file permissions

2. **Upload Failures**
   - Check file size limits
   - Verify MIME types
   - Check storage quotas

3. **Database Updates**
   - Check record IDs
   - Verify URL formats
   - Check database permissions

## Support

For issues:
1. Check error logs
2. Verify environment variables
3. Check network connectivity
4. Verify service account permissions

## Contributing

1. Follow TypeScript best practices
2. Add comprehensive error handling
3. Update documentation
4. Test thoroughly before submitting PRs 