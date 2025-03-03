/**
 * Firebase Cloud Function to check if an email exists in the system
 * 
 * This file is an example to be implemented in the Firebase Functions codebase
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

/**
 * Checks if an email already exists in Firebase Authentication
 * 
 * @param email - The email address to check
 * @returns A boolean indicating whether the email exists
 */
export const checkEmailExists = functions.https.onCall(
  async (data: { email: string }, context) => {
    try {
      // Validate the input
      if (!data.email) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'Email is required'
        );
      }

      // Check if the email exists in Firebase Auth
      try {
        const userRecord = await admin.auth().getUserByEmail(data.email);
        // If we get here, the email exists
        return true;
      } catch (error) {
        // If the error code is auth/user-not-found, the email doesn't exist
        if (error.code === 'auth/user-not-found') {
          return false;
        }
        // For any other error, re-throw it
        throw error;
      }
    } catch (error) {
      console.error('Error checking email existence:', error);
      
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      
      throw new functions.https.HttpsError(
        'internal',
        'An internal error occurred while checking email existence'
      );
    }
  }
);

/**
 * Implementation notes:
 * 
 * 1. This function needs to be deployed as a Firebase Cloud Function
 * 2. It requires Firebase Admin SDK to be initialized in your functions codebase
 * 3. To use this function from the client:
 *    ```
 *    const checkEmail = httpsCallable(functions, 'checkEmailExists');
 *    const result = await checkEmail({ email: 'user@example.com' });
 *    const exists = result.data; // boolean
 *    ```
 * 4. Make sure to set appropriate Firebase security rules to protect user data
 */ 