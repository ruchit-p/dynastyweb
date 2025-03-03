# Firebase Functions Implementation Guide

This directory contains examples of Firebase Cloud Functions that need to be implemented in your Firebase Functions codebase.

## Setting Up Firebase Functions

1. Make sure your Firebase project has Functions enabled
2. In your Firebase Functions directory (usually `/functions`), run:
   ```bash
   npm install firebase-admin firebase-functions
   ```

## Function: `checkEmailExists`

This function checks if an email address already exists in Firebase Authentication.

### Implementation Steps

1. Copy the `checkEmailExists.ts` file to your Firebase Functions codebase
2. Make sure your Firebase Admin SDK is initialized properly:
   ```typescript
   import * as admin from 'firebase-admin';
   
   admin.initializeApp();
   ```
3. Export the function in your main Firebase Functions index file:
   ```typescript
   export { checkEmailExists } from './checkEmailExists';
   ```
4. Deploy the function using Firebase CLI:
   ```bash
   firebase deploy --only functions:checkEmailExists
   ```

### Client-Side Usage

In your Next.js app, use the function like this:

```typescript
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';

// Function to check if email exists
const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const checkEmail = httpsCallable(functions, 'checkEmailExists');
    const result = await checkEmail({ email });
    return result.data as boolean;
  } catch (error) {
    console.error("Error checking email:", error);
    return false;
  }
};
```

## Function: `handleOAuthSignUp`

This function is referenced in the AuthContext for handling OAuth sign-ups (Google, Apple) and should:

1. Create a new user profile in Firestore
2. Initialize default family tree and history book
3. Set up default notification preferences

Refer to the existing `handleSignUp` Cloud Function for guidance on implementation.

## Security Considerations

1. These functions handle sensitive user data and should be properly secured
2. Use Firestore Security Rules to protect user data
3. Implement rate limiting to prevent abuse
4. Log sensitive operations for audit purposes

## Testing

1. Test the functions locally using Firebase Emulator Suite:
   ```bash
   firebase emulators:start
   ```
2. Write unit tests for your functions using the Firebase Functions test framework 