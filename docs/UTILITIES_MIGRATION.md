# Utilities Migration Guide

## Overview
This document outlines the process of migrating utility functions from Firebase to Supabase in the Dynasty Web application. The migration focuses on core utilities that handle authentication, database operations, and server functions.

## Migration Status

### Core Utilities
| File | Status | Description |
|------|--------|-------------|
| `functionUtils.ts` | 🔄 In Progress | Converting Firebase Cloud Functions to Supabase Edge Functions |
| `settingsManager.ts` | ⏳ Pending | Converting Firestore operations to Supabase |
| `storyUtils.ts` | ⏳ Pending | Converting Firestore queries to Supabase |

## Detailed Migration Plan

### 1. Function Utilities (`functionUtils.ts`)

#### Current Firebase Implementation
```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';

// Function calls
const functions = getFunctions(app);
const functionCall = httpsCallable(functions, 'functionName');
```

#### Supabase Migration
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Edge function calls
const { data, error } = await supabase.functions.invoke('functionName', {
  body: { /* params */ }
});
```

#### Migration Steps
1. Create equivalent Edge Functions in Supabase
2. Update function call signatures
3. Update error handling
4. Update type definitions
5. Test each function individually

### 2. Settings Manager (`settingsManager.ts`)

#### Current Firebase Implementation
```typescript
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

// Firestore operations
const docRef = doc(db, 'collection', 'id');
const snapshot = await getDoc(docRef);
```

#### Supabase Migration
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Supabase operations
const { data, error } = await supabase
  .from('table')
  .select()
  .eq('id', id)
  .single();
```

#### Migration Steps
1. Create equivalent tables in Supabase
2. Update CRUD operations
3. Update timestamp handling
4. Update real-time subscriptions
5. Test data consistency

### 3. Story Utils (`storyUtils.ts`)

#### Current Firebase Implementation
```typescript
import { collection, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Firestore queries
const q = query(
  collection(db, 'stories'),
  where('field', '==', value),
  orderBy('createdAt', 'desc')
);
```

#### Supabase Migration
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Supabase queries
const { data, error } = await supabase
  .from('stories')
  .select()
  .eq('field', value)
  .order('created_at', { ascending: false });
```

#### Migration Steps
1. Update database schema
2. Convert queries to Supabase format
3. Update data types
4. Implement filtering and sorting
5. Test query performance

## Type Conversions

### Timestamp Handling
```typescript
// Firebase
const timestamp = Timestamp.now();

// Supabase
const timestamp = new Date().toISOString();
```

### Document References
```typescript
// Firebase
type DocRef = DocumentReference;

// Supabase
type TableRef = string; // UUID
```

### Query Results
```typescript
// Firebase
type QueryResult = QuerySnapshot<DocumentData>;

// Supabase
type QueryResult = PostgrestResponse<T>;
```

## Testing Strategy

### Unit Tests
1. Create test utilities for Supabase
2. Update mock data structure
3. Test each utility function
4. Verify error handling
5. Check type safety

### Integration Tests
1. Test function chains
2. Verify data consistency
3. Test real-time features
4. Validate error scenarios
5. Check performance impact

## Rollback Procedures

### Quick Rollback
1. Keep Firebase implementation in separate files
2. Use feature flags for gradual rollout
3. Maintain dual configurations
4. Document dependencies

### Emergency Rollback
1. Revert to Firebase branch
2. Restore Firebase configuration
3. Update environment variables
4. Clear Supabase cache

## Post-Migration Verification

### Functionality Checks
- [ ] All functions working as expected
- [ ] Error handling is consistent
- [ ] Types are properly converted
- [ ] Performance is maintained or improved
- [ ] Real-time features are working

### Security Verification
- [ ] Access controls are properly set
- [ ] Data validation is maintained
- [ ] Rate limiting is implemented
- [ ] Sensitive data is protected

## Resources
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Database](https://supabase.com/docs/guides/database)
- [Supabase Real-time](https://supabase.com/docs/guides/realtime) 