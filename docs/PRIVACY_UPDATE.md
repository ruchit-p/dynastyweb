# Privacy Updates for Stories and History Books

## Overview

This update introduces revised privacy settings for stories and history books. The new privacy model is designed to be more intuitive and consistent, providing users with clear control over who can access their content.

## Story Privacy Types

Stories now have three privacy options:

1. **Family** - The story is visible to all family members
2. **Personal** - The story is only visible to the author
3. **Custom** - The story is only visible to specifically selected family members

## History Book Privacy Types

History books now have two privacy options:

1. **Family** - The history book is publicly visible to all family members, but individual story privacy settings still apply. Story privacy supersedes this setting.
2. **Personal** - The history book and all stories within it are only visible to the owner. This setting supersedes individual story privacy settings, making all stories private.

## Access Control Logic

### Story Access

- The author of a story always has access to it
- For family stories, all family members have access
- For personal stories, only the author has access
- For custom stories, only the author and explicitly selected family members have access

### History Book Access

- The owner of a history book always has access to it
- For family history books, all family members have access to the history book itself
- For personal history books, only the owner has access

### Story Access within History Books

- If a history book is set to personal, all stories within it are only visible to the owner, regardless of the individual story privacy settings
- If a history book is set to family, the individual story privacy settings determine who can access each story:
  - Family stories are visible to all family members
  - Personal stories are only visible to the author
  - Custom stories are only visible to the author and selected family members

## Database Changes

The following database changes were made:

1. Updated the `privacy_level` column in the `stories` table to accept the values 'family', 'personal', and 'custom'
2. Updated the `privacy_level` column in the `history_books` table to accept the values 'family' and 'personal'
3. Converted existing privacy levels:
   - 'public' → 'family'
   - 'private' → 'personal'

## UI Components

New UI components were created to support these privacy settings:

1. `StoryPrivacySettings` - A component for configuring story privacy settings
2. `HistoryBookPrivacySettings` - A component for configuring history book privacy settings

These components provide clear explanations of each privacy option and handle the selection of family members for custom access. 