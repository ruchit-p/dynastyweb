# Migrating from Hooks to Direct API

This document outlines our approach for migrating from custom hooks to direct API client usage in DynastyWeb.

## Overview

We've moved from using custom hooks like `useStories` and `useUser` to directly using the API client in our components. This approach better aligns with Next.js's server components architecture and provides more flexibility in implementation.

## Migration Strategy

### 1. Remove Unused Hooks

The following hooks have been removed as they're no longer needed:
- `useStories.ts`
- `useUser.ts`

### 2. Direct API Approach

Components now use the API client directly:

```tsx
// Before (with hook)
const { create } = useStories()
await create(storyData)

// After (direct API)
const result = await api.stories.createStory(storyData)
```

### 3. State Management

When using the API directly, implement state management within your components:

```tsx
// Component-level state
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
      setError("Not found")
    }
  } catch (error) {
    setError((error as Error).message)
  } finally {
    setLoading(false)
  }
}
```

### 4. Real-time Updates

For real-time functionality, use the `useRealtime` hook:

```tsx
// NOTE: Real-time updates are temporarily disabled and will be re-implemented later
// import { useRealtime } from "@/lib/client/hooks/useRealtime"

// In your component
// useRealtime<any>(
//   (event) => {
//     if (
//       event.type === 'story' && 
//       event.data && 
//       event.data.id === storyId
//     ) {
//       if (event.action === 'UPDATE') {
//         setStory(event.data)
//         toast({
//           title: "Story Updated",
//           description: "This story was just updated"
//         })
//       }
//     }
//   },
//   { type: 'story' }
// )
```

### 5. Error Handling

Implement consistent error handling in your components:

```tsx
try {
  // API call
} catch (error) {
  const errorMsg = (error as Error).message || 'Default error message'
  setError(errorMsg)
  logger.error('Error in function name', { error })
  toast({
    variant: 'destructive',
    title: 'Error',
    description: errorMsg,
  })
} finally {
  setLoading(false)
}
```

## Benefits

1. **Server Component Compatibility**: Direct API calls work better with Next.js server components
2. **Simpler Testing**: Components with direct API calls are easier to test
3. **Reduced Abstraction**: Fewer layers of abstraction makes the code easier to understand
4. **Better Performance**: More control over when and how data is fetched
5. **Explicit Dependencies**: Dependencies are more explicit in the component code

## Drawbacks and Mitigations

1. **Repetitive Code**: Some state management code is repeated across components
   - *Mitigation*: Follow the patterns in this document for consistency

2. **Real-time Complexity**: Setting up real-time updates requires more code
   - *Mitigation*: Use the `useRealtime` hook as shown above

3. **Error Handling**: Each component needs to implement error handling
   - *Mitigation*: Follow the standard error handling pattern