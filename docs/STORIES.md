# Dynasty Stories

This document explains how to work with stories in the Dynasty app.

## Overview

Stories are a core feature of Dynasty, allowing users to share memories, events, and moments with their family members.

## API vs. Client Components

In our previous version, we used a `useStories` hook to handle stories. We've since moved to a more direct approach using the API client. This section explains the transition and current approach.

### Direct API Approach (Current)

We now use the API client directly in components:

```tsx
// Example: Getting a story
const response = await api.stories.getStory(id)

// Example: Creating a story
const result = await api.stories.createStory(storyData)

// Example: Updating a story
const response = await api.stories.updateStory(id, storyData)

// Example: Deleting a story
const response = await api.stories.deleteStory(id)
```

This approach:
- Works better with Next.js Server Components
- Provides direct access to Edge Functions
- Keeps state management at the page level
- Separates data fetching from UI concerns

### Adding State Management

When using the API client directly, implement state management in your component:

```tsx
// State management example
const [story, setStory] = useState<StoryData | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

// Fetch function
const fetchStory = async () => {
  try {
    setLoading(true)
    setError(null)
    
    const response = await api.stories.getStory(id)
    
    if (response.error) throw new Error(response.error.message)
    
    if (response.data) {
      setStory(response.data)
    } else {
      setError("Story not found")
    }
  } catch (error) {
    setError((error as Error).message)
  } finally {
    setLoading(false)
  }
}
```

### Real-time Updates

For real-time updates, use the `useRealtime` hook:

```tsx
// NOTE: Real-time updates are temporarily disabled and will be re-implemented later
// Import the hook
// import { useRealtime } from "@/lib/client/hooks/useRealtime"

// In your component
// useRealtime<StoryEvent['data']>(
//   (event) => {
//     if (
//       event.type === 'story' && 
//       event.data && 
//       event.data.id === storyId
//     ) {
//       if (event.action === 'UPDATE') {
//         setStory(event.data)
//       }
//     }
//   },
//   { type: 'story' }
// )
```

## Legacy Hook Approach (Deprecated)

> Note: The useStories hook has been removed in favor of the direct API approach described above.

~~Example usage of the previous hook:~~

```tsx
// DEPRECATED - Don't use this approach
const { create } = useStories()
await create(storyData)

const { update } = useStories()
await update(storyId, storyData)

const { loadFamilyStories } = useStories()
await loadFamilyStories(familyTreeId)
```

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