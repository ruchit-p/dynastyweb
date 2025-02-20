'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, setDoc, collection, serverTimestamp, writeBatch } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName: string, lastName: string, phone: string, dateOfBirth: Date, gender: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUp = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    phone: string, 
    dateOfBirth: Date,
    gender: string
  ) => {
    try {
      // Create Firebase Auth user
      const result = await createUserWithEmailAndPassword(auth, email, password);
      const userId = result.user.uid;
      
      // Create a batch for Firestore operations
      const batch = writeBatch(db);
      
      // Create family tree document
      const familyTreeRef = doc(collection(db, 'familyTrees'));
      const familyTreeId = familyTreeRef.id;
      batch.set(familyTreeRef, {
        id: familyTreeId,
        ownerUserId: userId,
        memberUserIds: [userId],
        adminUserIds: [userId],
        treeName: `${firstName}'s Family Tree`,
        memberCount: 1,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isPrivate: true
      });

      // Create history book document
      const historyBookRef = doc(collection(db, 'historyBooks'));
      const historyBookId = historyBookRef.id;
      batch.set(historyBookRef, {
        id: historyBookId,
        ownerUserId: userId,
        familyTreeId: familyTreeId,
        title: `${firstName}'s History Book`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Create user document
      const userRef = doc(db, 'users', userId);
      batch.set(userRef, {
        id: userId,
        displayName: `${firstName} ${lastName}`.trim(),
        email,
        dateOfBirth,
        firstName,
        lastName,
        phoneNumber: phone,
        gender,
        familyTreeId,
        historyBookId,
        parentIds: [],
        childrenIds: [],
        spouseIds: [],
        isAdmin: true,
        canAddMembers: true,
        canEdit: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Commit the batch
      await batch.commit();

      // Update user profile in Firebase Auth
      await updateProfile(result.user, {
        displayName: `${firstName} ${lastName}`.trim()
      });

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
      await signOut(auth);
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
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

  const value = {
    user,
    loading,
    signUp,
    signIn,
    logout,
    resetPassword,
    updateUserProfile,
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