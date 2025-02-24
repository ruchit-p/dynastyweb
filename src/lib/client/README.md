# Client-Side Library

This directory contains client-side utilities, hooks, and context providers for the Dynasty Web application.

## Directory Structure

```
client/
├── hooks/           # React hooks
│   ├── useAuth.ts   # Authentication hooks
│   ├── useStories.ts # Story management hooks
│   └── useTree.ts   # Family tree hooks
├── context/         # React context providers
│   ├── AuthContext.tsx    # Authentication context
│   └── ToastContext.tsx   # Toast notifications
├── utils/           # Client utilities
│   ├── supabase.ts  # Supabase client
│   ├── mediaUtils.ts # Media handling
│   └── validation.ts # Form validation
└── components/      # Shared client components
```

## Supabase Integration

### Client Setup (`utils/supabase.ts`)

```typescript
import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Authentication Hook (`hooks/useAuth.ts`)

```typescript
import { useAuth } from './hooks/useAuth'

// Usage
const { user, signIn, signOut, signUp } = useAuth()
```

Features:
- User authentication state
- Sign in/out
- Sign up with email verification
- Password reset
- Profile management

### Real-time Subscriptions

```typescript
// Subscribe to changes
const subscription = supabase
  .channel('table_db_changes')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'your_table' },
    (payload) => {
      // Handle change
    }
  )
  .subscribe()
```

## React Hooks

### `useAuth`

Authentication hook:
```typescript
const {
  user,
  loading,
  signIn,
  signOut,
  signUp,
  resetPassword,
  updateProfile
} = useAuth()
```

### `useStories`

Story management hook:
```typescript
const {
  stories,
  loading,
  createStory,
  updateStory,
  deleteStory,
  uploadMedia
} = useStories()
```

### `useTree`

Family tree management hook:
```typescript
const {
  tree,
  loading,
  members,
  inviteMembers,
  updateMember,
  removeMember
} = useTree(treeId)
```

## Context Providers

### AuthContext

```typescript
import { AuthProvider, useAuth } from './context/AuthContext'

// Wrap your app
<AuthProvider>
  <App />
</AuthProvider>

// Use in components
const { user } = useAuth()
```

### ToastContext

```typescript
import { ToastProvider, useToast } from './context/ToastContext'

// Use in components
const { showToast } = useToast()
showToast({ message: 'Success!', type: 'success' })
```

## Utilities

### Media Utils

The `mediaUtils.ts` file provides utilities for handling media uploads, processing, and validation using Supabase Storage.

#### Media Upload

```typescript
import { uploadMedia } from '@/lib/client/utils/mediaUtils';

// Basic upload
const url = await uploadMedia(file);

// Upload with options
const url = await uploadMedia(file, {
  bucket: 'custom-bucket',
  path: 'stories/',
  processOptions: {
    resize: {
      width: 800,
      height: 600,
      fit: 'cover'
    },
    compress: {
      quality: 0.8,
      format: 'webp'
    }
  },
  onProgress: (progress) => console.log(`Upload progress: ${progress}%`)
});
```

#### Media Processing

```typescript
import { processMedia } from '@/lib/client/utils/mediaUtils';

const processedUrl = await processMedia(originalUrl, {
  resize: {
    width: 400,
    height: 300,
    fit: 'contain'
  },
  compress: {
    quality: 0.7,
    format: 'jpeg'
  }
});
```

#### Media Deletion

```typescript
import { deleteMedia } from '@/lib/client/utils/mediaUtils';

await deleteMedia(mediaUrl);
```

#### Validation

```typescript
import { validateMediaFile } from '@/lib/client/utils/mediaUtils';

if (validateMediaFile(file)) {
  // File is valid, proceed with upload
}
```

#### Features

- **Client-side Processing**: Resize and compress images before upload
- **Progress Tracking**: Monitor upload progress
- **Format Conversion**: Convert between JPEG, WebP, and PNG formats
- **Error Handling**: Toast notifications for user feedback
- **Type Safety**: Full TypeScript support
- **Validation**: File type and size checks

#### Edge Function Integration

Media processing is handled by a Supabase Edge Function that provides:

- Efficient image processing using Sharp
- Multiple operation support (resize, compress, format conversion)
- Secure file handling
- Caching for improved performance

#### Best Practices

1. **File Size**:
   - Limit uploads to 10MB
   - Use compression for large images
   - Consider format conversion for optimal size/quality

2. **Image Processing**:
   - Use WebP for better compression when supported
   - Maintain aspect ratio with 'cover' or 'contain' fit
   - Process images server-side for consistency

3. **Error Handling**:
   - Validate files before upload
   - Provide user feedback via toast notifications
   - Handle network errors gracefully

4. **Security**:
   - Validate file types
   - Use signed URLs for private content
   - Clean metadata from uploaded files

5. **Performance**:
   - Use progress tracking for large uploads
   - Cache processed images
   - Implement retry logic for failed uploads

### Validation

```typescript
import { validateEmail, validatePassword } from './utils/validation'

const isValid = validateEmail(email)
const errors = validatePassword(password)
```

## Error Handling

All API calls include proper error handling:

```typescript
try {
  const result = await supabase.from('table').select()
  // Handle success
} catch (error) {
  // Handle error with toast notification
  showToast({
    message: error.message,
    type: 'error'
  })
}
```

## Type Safety

All Supabase operations are typed:

```typescript
import type { Database } from '@/lib/shared/types/supabase'

// Typed query
const { data, error } = await supabase
  .from('users')
  .select<'*', Database['public']['Tables']['users']['Row']>()
```

## Best Practices

1. **State Management**
   - Use React Query for server state
   - Use context for global state
   - Use local state for component state

2. **Performance**
   - Implement proper caching
   - Use optimistic updates
   - Debounce real-time subscriptions

3. **Security**
   - Never store sensitive data in client
   - Validate all user input
   - Use proper error boundaries

4. **Testing**
   - Write unit tests for hooks
   - Write integration tests for context
   - Mock Supabase calls in tests 