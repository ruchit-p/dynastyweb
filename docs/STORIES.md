# Stories Feature Documentation

## Overview
The Stories feature allows family members to share and preserve their family memories, experiences, and history through rich multimedia content. Stories can include text, images, videos, and audio recordings, and can be shared with specific family members or the entire family tree.

## Features
- Create multimedia stories with text, images, videos, and audio
- Tag family members in stories
- Set privacy levels (family, personal, or custom access)
- Add location data to stories
- Include event dates
- Rich text editing capabilities

## Story Structure
A story consists of the following components:
- Title (required)
- Content (required)
- Media URLs (optional)
- Tags (optional)
- Privacy Level
- Author Information
- Creation/Update Timestamps
- Family Tree ID
- Location Data (optional)
- Event Date (optional)
- Tagged Members

## Privacy Levels
Stories can be shared with different levels of privacy:
- **Family**: Visible to all members of the family tree
- **Personal**: Only visible to the author
- **Custom**: Visible to specifically selected family members

## Technical Implementation

### Database Schema
Stories are stored in the Supabase database with the following structure:
```sql
stories (
  id: uuid PRIMARY KEY,
  title: text NOT NULL,
  content: text NOT NULL,
  family_tree_id: uuid REFERENCES family_trees(id),
  author_id: uuid REFERENCES auth.users(id),
  media_urls: text[],
  tags: text[],
  privacy_level: text CHECK (privacy_level IN ('family', 'personal', 'custom')),
  custom_access_members: uuid[],
  location: jsonb,
  event_date: timestamp,
  created_at: timestamp DEFAULT now(),
  updated_at: timestamp
)
```

### API Functions
The following functions are available for managing stories:

#### Create Story
```typescript
createStory({
  title: string;
  content: string;
  familyTreeId: string;
  mediaUrls?: string[];
  tags?: string[];
  privacyLevel: 'family' | 'personal' | 'custom';
  customAccessMembers?: string[];
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  eventDate?: Date;
}): Promise<{ id: string }>
```

#### Update Story
```typescript
updateStory({
  id: string;
  title?: string;
  content?: string;
  mediaUrls?: string[];
  tags?: string[];
  privacyLevel?: 'family' | 'personal' | 'custom';
  customAccessMembers?: string[];
  location?: Location;
  eventDate?: Date;
}): Promise<Story>
```

#### Delete Story
```typescript
deleteStory(id: string): Promise<void>
```

#### Get Family Tree Stories
```typescript
getFamilyTreeStories(familyTreeId: string): Promise<Story[]>
```

### Client Hooks
The `useStories` hook provides a convenient way to interact with stories:
```typescript
const {
  loading,
  stories,
  create,
  update,
  remove,
  loadFamilyStories,
} = useStories()
```

## Usage Examples

### Creating a Story
```typescript
const { create } = useStories()

await create({
  title: "Family Reunion 2024",
  content: "It was a wonderful day...",
  familyTreeId: "your-family-tree-id",
  mediaUrls: ["url1", "url2"],
  tags: ["reunion", "family"],
  privacyLevel: "family"
})
```

### Updating a Story
```typescript
const { update } = useStories()

await update({
  id: "story-id",
  title: "Updated Title",
  content: "Updated content..."
})
```

### Loading Family Stories
```typescript
const { loadFamilyStories } = useStories()

const stories = await loadFamilyStories("your-family-tree-id")
```

## Security Considerations
- Stories are protected by row-level security in Supabase
- Access is controlled by privacy levels and family tree membership
- Media uploads are secured and validated
- Custom access lists are validated against family tree membership

## Best Practices
1. Always validate media files before upload
2. Use appropriate privacy levels based on content sensitivity
3. Tag relevant family members for better discoverability
4. Include descriptive titles and content
5. Add location and date information when relevant
6. Use appropriate media formats and sizes

## Error Handling
The story functions include comprehensive error handling:
- Input validation
- Permission checks
- Media upload validation
- Database operation error handling
- Network error handling

## Future Enhancements
- Story categories/collections
- Advanced media editing
- Story templates
- Collaborative storytelling
- Story reactions and comments
- Story search and filtering
- Story analytics 