# Database Schema

## Overview

This directory contains schema files for development and reference purposes. The main schema file for migrations is located in `/supabase/migrations/00000000000000_schema.sql`.

## Files

- `schema.sql`: The main development schema file. This contains all table definitions, functions, and policies for the application.

## Notes

- Previously, there were separate files for policy fixes (`fix_policies.sql` and `apply_fixes.sql`), but these have been consolidated into the main schema file.
- The fixed non-recursive policies for `family_tree_members` have replaced the previous policies that were causing infinite recursion errors.
- All changes in the development schema are mirrored in the Supabase migration file to ensure consistency.

## Applying Schema Changes

To apply schema changes to your Supabase database:

1. Make changes to `schema.sql` first for development and testing
2. Once verified, update `/supabase/migrations/00000000000000_schema.sql`
3. Apply using the Supabase CLI:

```bash
supabase db reset
```

Or for production:

```bash
supabase db push
```

## Troubleshooting

If you encounter infinite recursion errors in policies, check for circular references in the policy definitions, particularly in nested `EXISTS` queries with ambiguous column references. 