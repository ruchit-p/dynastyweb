import { db, auth } from './firebase';
import { collection, getDocs, limit, query } from 'firebase/firestore';

export async function testFirebaseConnection() {
  const results = {
    auth: false,
    firestore: false,
    error: null as string | null
  };

  try {
    // Test auth initialization
    results.auth = !!auth.app;
    
    // Test Firestore connection with a simple query
    try {
      const usersCollection = collection(db, 'users');
      const q = query(usersCollection, limit(1));
      await getDocs(q);
      results.firestore = true;
    } catch (firestoreError) {
      results.firestore = false;
      results.error = `Firestore error: ${firestoreError instanceof Error ? firestoreError.message : JSON.stringify(firestoreError)}`;
    }
    
    console.log('Firebase connection test results:', results);
    return results;
  } catch (error) {
    results.error = `General Firebase error: ${error instanceof Error ? error.message : JSON.stringify(error)}`;
    console.error('Firebase connection test failed:', results);
    return results;
  }
} 