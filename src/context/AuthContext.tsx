'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
  OAuthProvider,
  PhoneAuthProvider,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink,
  setPersistence,
  browserLocalPersistence,
  UserCredential,
  signInWithCredential,
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
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: Date;
  gender: string;
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
  signUp: (email: string, password: string, confirmPassword: string, firstName: string, lastName: string, phone: string, dateOfBirth: Date, gender: string) => Promise<void>;
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
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  startPhoneAuth: (phoneNumber: string) => Promise<string>;
  confirmPhoneAuth: (verificationId: string, verificationCode: string) => Promise<void>;
  sendEmailLink: (email: string) => Promise<void>;
  signInWithLink: (email: string, link: string) => Promise<void>;
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
  signInWithGoogle: async () => {},
  signInWithApple: async () => {},
  startPhoneAuth: async () => '',
  confirmPhoneAuth: async () => {},
  sendEmailLink: async () => {},
  signInWithLink: async () => {},
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

// Get additional user info from UserCredential
const getAdditionalUserInfo = (result: UserCredential): { isNewUser?: boolean } => {
  // This is a workaround for typing issues with additionalUserInfo
  // Firebase JS SDK does include this property but TypeScript definitions are incomplete
  return (result as { additionalUserInfo?: { isNewUser?: boolean } }).additionalUserInfo || { isNewUser: false };
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
    // Set persistence to local (persists even after window/tab closed)
    setPersistence(auth, browserLocalPersistence).catch(error => {
      console.error("[Auth] Error setting persistence:", error);
    });

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const userData = await fetchFirestoreUser(user.uid);
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
    confirmPassword: string,
    firstName: string,
    lastName: string,
    phone: string,
    dateOfBirth: Date,
    gender: string
  ): Promise<void> => {
    try {
      const handleSignUp = httpsCallable<SignUpRequest, SignUpResult>(functions, 'handleSignUp');
      await handleSignUp({
        email,
        password,
        confirmPassword,
        firstName,
        lastName,
        phone,
        dateOfBirth,
        gender,
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

  const signInWithGoogle = async (): Promise<void> => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if this is a new user (first time sign-in)
      // If so, we need to create a profile in Firestore
      const additionalInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalInfo.isNewUser || false;
      
      if (isNewUser) {
        // Call a Cloud Function to set up the user in Firestore
        const handleOAuthSignUp = httpsCallable(functions, 'handleOAuthSignUp');
        await handleOAuthSignUp({
          userId: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          provider: 'google',
        });
      }
    } catch (error) {
      console.error('[Auth] Google sign-in error:', error);
      throw error;
    }
  };

  const signInWithApple = async (): Promise<void> => {
    try {
      const provider = new OAuthProvider('apple.com');
      provider.addScope('email');
      provider.addScope('name');
      
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if this is a new user
      const additionalInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalInfo.isNewUser || false;
      
      if (isNewUser) {
        // Call a Cloud Function to set up the user in Firestore
        const handleOAuthSignUp = httpsCallable(functions, 'handleOAuthSignUp');
        await handleOAuthSignUp({
          userId: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL,
          provider: 'apple',
        });
      }
    } catch (error) {
      console.error('[Auth] Apple sign-in error:', error);
      throw error;
    }
  };

  // Start phone authentication
  const startPhoneAuth = async (phoneNumber: string): Promise<string> => {
    try {
      // Create a reCAPTCHA verifier instance
      const recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
      });
      
      // Start the phone authentication process
      const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, recaptchaVerifier);
      
      // Return the verification ID that will be used to complete sign-in
      return confirmationResult.verificationId;
    } catch (error) {
      console.error('[Auth] Phone auth start error:', error);
      throw error;
    }
  };

  // Complete phone authentication
  const confirmPhoneAuth = async (verificationId: string, verificationCode: string): Promise<void> => {
    try {
      // Create the phone credential
      const credential = PhoneAuthProvider.credential(verificationId, verificationCode);
      
      // Sign in with the credential
      const result = await signInWithCredential(auth, credential);
      const user = result.user;
      
      // Check if this is a new user
      const additionalInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalInfo.isNewUser || false;
      
      if (isNewUser) {
        // Call a Cloud Function to set up the user in Firestore
        const handleOAuthSignUp = httpsCallable(functions, 'handleOAuthSignUp');
        await handleOAuthSignUp({
          userId: user.uid,
          phoneNumber: user.phoneNumber,
          provider: 'phone',
        });
      }
    } catch (error) {
      console.error('[Auth] Phone auth confirmation error:', error);
      throw error;
    }
  };

  // Send email link for passwordless auth
  const sendEmailLink = async (email: string): Promise<void> => {
    try {
      const actionCodeSettings = {
        // URL you want to redirect to after email is verified
        url: `${window.location.origin}/auth/email-link-signin?email=${email}`,
        handleCodeInApp: true,
      };
      
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Save the email to localStorage to use it later
      window.localStorage.setItem('emailForSignIn', email);
    } catch (error) {
      console.error('[Auth] Send email link error:', error);
      throw error;
    }
  };

  // Sign in with email link
  const signInWithLink = async (email: string, link: string): Promise<void> => {
    try {
      // Check if the link is a sign-in link
      if (isSignInWithEmailLink(auth, link)) {
        // Sign in with the link
        const result = await signInWithEmailLink(auth, email, link);
        const user = result.user;
        
        // Check if this is a new user
        const additionalInfo = getAdditionalUserInfo(result);
        const isNewUser = additionalInfo.isNewUser || false;
        
        if (isNewUser) {
          // Call a Cloud Function to set up the user in Firestore
          const handleOAuthSignUp = httpsCallable(functions, 'handleOAuthSignUp');
          await handleOAuthSignUp({
            userId: user.uid,
            email: user.email,
            provider: 'email-link',
          });
        }
        
        // Clear email from localStorage
        window.localStorage.removeItem('emailForSignIn');
      } else {
        throw new Error('Invalid sign-in link');
      }
    } catch (error) {
      console.error('[Auth] Sign in with link error:', error);
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

  const value = {
    currentUser: user,
    firestoreUser,
    loading,
    signUp,
    signIn,
    signOut: logout,
    resetPassword,
    updateUserProfile,
    updateEmail: async () => {},
    updatePassword: async () => {},
    sendVerificationEmail,
    signUpWithInvitation,
    verifyInvitation,
    refreshFirestoreUser,
    signInWithGoogle,
    signInWithApple,
    startPhoneAuth,
    confirmPhoneAuth,
    sendEmailLink,
    signInWithLink,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
}; 