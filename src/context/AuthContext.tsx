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

// Add RecaptchaVerifier to the Window interface
declare global {
  interface Window {
    recaptchaVerifier: RecaptchaVerifier | null;
  }
}

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

interface PasswordlessLinkResponse {
  success: boolean;
}

interface VerifyPasswordlessLinkResponse {
  success: boolean;
  customToken: string;
  userId: string;
}

interface CompletePasswordlessSignUpResponse {
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
  signInWithGoogle: () => Promise<UserCredential | null>;
  signInWithApple: () => Promise<void>;
  startPhoneAuth: (phoneNumber: string) => Promise<string>;
  confirmPhoneAuth: (verificationId: string, verificationCode: string) => Promise<void>;
  sendEmailLink: (email: string) => Promise<void>;
  signInWithLink: (email: string, link: string) => Promise<void>;
  sendPasswordlessLink: (email: string, isNewUser?: boolean) => Promise<void>;
  verifyPasswordlessLink: (token: string, email: string, isNewUser?: boolean) => Promise<string>;
  completePasswordlessSignUp: (userData: SignUpRequest) => Promise<SignUpResult>;
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
  signInWithGoogle: async () => null,
  signInWithApple: async () => {},
  startPhoneAuth: async () => '',
  confirmPhoneAuth: async () => {},
  sendEmailLink: async () => {},
  signInWithLink: async () => {},
  sendPasswordlessLink: async () => {},
  verifyPasswordlessLink: async () => '',
  completePasswordlessSignUp: async () => ({ success: false, userId: '', familyTreeId: '', historyBookId: '' }),
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

  const signInWithGoogle = async (): Promise<UserCredential | null> => {
    try {
      // Create a Google auth provider
      const provider = new GoogleAuthProvider();
      
      // Add scopes if needed
      provider.addScope('profile');
      provider.addScope('email');
      
      // Set custom parameters
      provider.setCustomParameters({
        prompt: 'select_account'
      });
      
      // Sign in with popup
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
          provider: 'google',
        });
      }
      
      // Return the user credential
      return result;
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
      // Format the phone number to ensure it has the international format
      // If it doesn't start with +, add +1 (US) as default
      let formattedPhone = phoneNumber;
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = `+1${formattedPhone.replace(/\D/g, '')}`;
      } else {
        // Just remove any non-digit characters except the leading +
        formattedPhone = '+' + formattedPhone.substring(1).replace(/\D/g, '');
      }
      
      console.log('Formatted phone number:', formattedPhone);
      
      // Clear any existing reCAPTCHA widgets
      window.recaptchaVerifier = null;
      
      // Get the recaptcha container
      const recaptchaContainer = document.getElementById('recaptcha-container');
      if (!recaptchaContainer) {
        throw new Error('reCAPTCHA container not found');
      }
      
      // Clear the container
      recaptchaContainer.innerHTML = '';
      
      // Create a reCAPTCHA verifier instance
      const recaptchaVerifier = new RecaptchaVerifier(auth, recaptchaContainer, {
        size: 'normal', // Use normal size instead of invisible
        callback: () => {
          console.log('reCAPTCHA verified');
        },
        'expired-callback': () => {
          console.log('reCAPTCHA expired');
          // Refresh the captcha
          recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
      });
      
      // Store the verifier in window for potential reuse
      window.recaptchaVerifier = recaptchaVerifier;
      
      // Render the reCAPTCHA widget
      await recaptchaVerifier.render();
      
      // Start the phone authentication process
      const confirmationResult = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifier);
      
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
      if (!isSignInWithEmailLink(auth, link)) {
        throw new Error('Invalid sign-in link');
      }
      
      console.log('[Auth] Attempting to sign in with email link:', email);
      
      // Sign in with the link
      const result = await signInWithEmailLink(auth, email, link);
      const user = result.user;
      
      console.log('[Auth] Successfully signed in with email link, user:', user.uid);
      
      // Check if this is a new user
      const additionalInfo = getAdditionalUserInfo(result);
      const isNewUser = additionalInfo.isNewUser || false;
      
      console.log('[Auth] Is new user:', isNewUser);
      
      if (isNewUser) {
        console.log('[Auth] Setting up new user in Firestore');
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
      window.localStorage.removeItem('isNewUser');
      
      // Refresh the Firestore user data
      await refreshFirestoreUser();
      
      console.log('[Auth] Email link sign-in completed successfully');
    } catch (error) {
      console.error('[Auth] Sign in with link error:', error);
      throw error;
    }
  };

  // Custom passwordless authentication using our Cloud Functions
  const sendPasswordlessLink = async (email: string, isNewUser = false): Promise<void> => {
    try {
      // Define actionCodeSettings according to Firebase docs
      const actionCodeSettings = {
        // URL you want to redirect back to. The domain (www.example.com) for this
        // URL must be in the authorized domains list in the Firebase Console.
        url: `${window.location.origin}/auth/email-link-signin?email=${encodeURIComponent(email)}&isNewUser=${isNewUser}`,
        // This must be true
        handleCodeInApp: true,
      };

      // First try to use Firebase's built-in method
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      
      // Save the email locally to complete the sign-in on the same device
      window.localStorage.setItem('emailForSignIn', email);
      window.localStorage.setItem('isNewUser', isNewUser.toString());
      
      console.log('[Auth] Email link sent successfully using Firebase method');
    } catch (error) {
      console.error('[Auth] Firebase email link error, falling back to Cloud Function:', error);
      
      // Fall back to our custom Cloud Function if Firebase method fails
      try {
        const sendPasswordlessLinkFn = httpsCallable(functions, 'sendPasswordlessLink');
        const result = await sendPasswordlessLinkFn({ email, isNewUser });
        
        if (!result.data || !(result.data as PasswordlessLinkResponse).success) {
          throw new Error('Failed to send passwordless link');
        }
        
        // Save the email to localStorage to use it later
        window.localStorage.setItem('emailForSignIn', email);
        window.localStorage.setItem('isNewUser', isNewUser.toString());
        
        console.log('[Auth] Email link sent successfully using Cloud Function');
      } catch (cloudFnError) {
        console.error('[Auth] Cloud Function email link error:', cloudFnError);
        throw cloudFnError;
      }
    }
  };

  // Verify passwordless link using our Cloud Functions
  const verifyPasswordlessLink = async (token: string, email: string, isNewUser = false): Promise<string> => {
    try {
      const verifyPasswordlessLinkFn = httpsCallable(functions, 'verifyPasswordlessLink');
      const result = await verifyPasswordlessLinkFn({ token, email, isNewUser });
      
      const data = result.data as VerifyPasswordlessLinkResponse;
      if (!data || !data.success || !data.customToken) {
        throw new Error('Failed to verify passwordless link');
      }
      
      // Sign in with the custom token
      await signInWithCredential(auth, GoogleAuthProvider.credential(null, data.customToken));
      
      // Return the user ID
      return data.userId;
    } catch (error) {
      console.error('[Auth] Verify passwordless link error:', error);
      throw error;
    }
  };

  // Complete passwordless sign-up using our Cloud Functions
  const completePasswordlessSignUp = async (userData: SignUpRequest): Promise<SignUpResult> => {
    try {
      const completePasswordlessSignUpFn = httpsCallable(functions, 'completePasswordlessSignUp');
      const result = await completePasswordlessSignUpFn(userData);
      
      const data = result.data as CompletePasswordlessSignUpResponse;
      if (!data || !data.success) {
        throw new Error('Failed to complete passwordless sign-up');
      }
      
      // Refresh the Firestore user data
      await refreshFirestoreUser();
      
      return {
        success: true,
        userId: data.userId,
        familyTreeId: data.familyTreeId,
        historyBookId: data.historyBookId
      };
    } catch (error) {
      console.error('[Auth] Complete passwordless sign-up error:', error);
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
    sendPasswordlessLink,
    verifyPasswordlessLink,
    completePasswordlessSignUp,
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