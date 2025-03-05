'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  updateEmail as firebaseUpdateEmail,
  updatePassword as firebaseUpdatePassword,
} from 'firebase/auth';
import { auth, functions, db } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, getDoc } from 'firebase/firestore';
import type { InvitedSignupFormData } from "@/lib/validation";

// MARK: - Types
interface FirestoreUser {
  id: string;
  displayName: string;
  email: string;
  dateOfBirth: Date;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  parentIds: string[];
  childrenIds: string[];
  spouseIds: string[];
  isAdmin: boolean;
  canAddMembers: boolean;
  canEdit: boolean;
  isPendingSignUp: boolean;
  createdAt: Date;
  updatedAt: Date;
  gender: string;
  familyTreeId?: string;
  historyBookId?: string;
  emailVerified?: boolean;
  dataRetentionPeriod: "forever" | "year" | "month" | "week";
  profilePicture?: string;
}

interface SignUpRequest {
  email: string;
  password: string
}

interface SignUpResult {
  success: boolean;
  userId: string;
  familyTreeId: string;
  historyBookId: string;
}

interface AuthContextType {
  currentUser: User | null;
  firestoreUser: FirestoreUser | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateEmail: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  signUpWithInvitation: (data: InvitedSignupFormData) => Promise<{ success: boolean; userId: string; familyTreeId: string }>;
  verifyInvitation: (token: string, invitationId: string) => Promise<{
    prefillData: {
      firstName: string;
      lastName: string;
      dateOfBirth?: Date;
      gender?: string;
      phoneNumber?: string;
      relationship?: string;
    };
    inviteeEmail: string;
  }>;
  refreshFirestoreUser: () => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  firestoreUser: null,
  loading: false,
  signUp: async () => {},
  signIn: async () => {},
  signOut: async () => {},
  resetPassword: async () => {},
  updateEmail: async () => {},
  updatePassword: async () => {},
  updateUserProfile: async () => {},
  sendVerificationEmail: async () => {},
  signUpWithInvitation: async () => ({ success: false, userId: '', familyTreeId: '' }),
  verifyInvitation: async () => ({
    prefillData: {
      firstName: '',
      lastName: '',
    },
    inviteeEmail: '',
  }),
  refreshFirestoreUser: async () => {},
});

// MARK: - Helper Functions
const fetchFirestoreUser = async (userId: string): Promise<FirestoreUser | null> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      console.warn(`[Auth] No Firestore document found for user ${userId}`);
      return null;
    }
    return userDoc.data() as FirestoreUser;
  } catch (error) {
    console.error("[Auth] Error fetching Firestore user:", error);
    return null;
  }
};



// MARK: - Provider Component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [firestoreUser, setFirestoreUser] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshFirestoreUser = async () => {
    if (user?.uid) {
      const userData = await fetchFirestoreUser(user.uid);
      setFirestoreUser(userData);
    }
  };

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("[Auth] Error setting persistence:", error);
    });
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userData = await fetchFirestoreUser(currentUser.uid);
        setFirestoreUser(userData);
      } else {
        setFirestoreUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signUp = async (
    email: string,
    password: string,
  ): Promise<void> => {
    try {
      const handleSignUp = httpsCallable<SignUpRequest, SignUpResult>(functions, 'handleSignUp');
      await handleSignUp({
        email,
        password,
      });

      // Sign in the user after successful signup
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const initiatePasswordReset = httpsCallable(functions, 'initiatePasswordReset');
      await initiatePasswordReset({ email });
    } catch (error) {
      throw error;
    }
  };

  const updateUserProfile = async (displayName: string) => {
    try {
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { displayName });
      }
    } catch (error) {
      throw error;
    }
  };

  const sendVerificationEmail = async () => {
    try {
      if (auth.currentUser) {
        const handleVerificationEmail = httpsCallable(functions, 'sendVerificationEmail');
        await handleVerificationEmail({
          userId: auth.currentUser.uid,
          email: auth.currentUser.email!,
          displayName: auth.currentUser.displayName || 'User'
        });
      } else {
        throw new Error('No user is currently signed in');
      }
    } catch (error) {
      throw error;
    }
  };

  const signUpWithInvitation = async (data: InvitedSignupFormData) => {
    const handleInvitedSignUp = httpsCallable<InvitedSignupFormData, { success: boolean; userId: string; familyTreeId: string }>(
      functions,
      "handleInvitedSignUp"
    );
    const result = await handleInvitedSignUp(data);
    
    // Sign in the user after successful signup and wait for auth state to update
    await signInWithEmailAndPassword(auth, data.email, data.password);
    
    // Return the result so the UI can handle the response
    return result.data;
  };

  const verifyInvitation = async (token: string, invitationId: string) => {
    const verifyInvitationToken = httpsCallable<
      { token: string; invitationId: string },
      {
        prefillData: {
          firstName: string;
          lastName: string;
          dateOfBirth?: Date;
          gender?: string;
          phoneNumber?: string;
          relationship?: string;
        };
        inviteeEmail: string;
      }
    >(functions, "verifyInvitationToken");

    const result = await verifyInvitationToken({ token, invitationId });
    return result.data;
  };

  const updateEmail = async (email: string) => {
    try {
      if (auth.currentUser) {
        await firebaseUpdateEmail(auth.currentUser, email);
      }
    } catch (error) {
      throw error;
    }
  };

  const updatePassword = async (password: string) => {
    try {
      if (auth.currentUser) { 
        await firebaseUpdatePassword(auth.currentUser, password);
      }
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    currentUser: user,
    firestoreUser,
    loading,
    signUp,
    signIn,
    signOut: logout,
    resetPassword,
    updateEmail,
    updatePassword,
    updateUserProfile,
    sendVerificationEmail,
    signUpWithInvitation,
    verifyInvitation,
    refreshFirestoreUser,
   };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);