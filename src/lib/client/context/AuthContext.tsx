'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import { toast } from '@/components/ui/use-toast';
import { 
  signUp, 
  signIn, 
  signOut, 
  resetPassword, 
  getSession,
  refreshSession,
  verifyInvitation,
  signUpWithInvitation,
  type InvitedSignUpData
} from '@/app/actions/auth';

// MARK: - Types
type AuthError = {
  message: string;
};

type PrefillData = {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: string;
  phoneNumber?: string;
  relationship?: string;
};

type VerifyInvitationResult = {
  success: boolean;
  prefillData?: PrefillData;
  inviteeEmail?: string;
  error?: AuthError;
};

type SignUpData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
};

type LoginData = {
  email: string;
  password: string;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signUp: (data: SignUpData) => Promise<void>;
  signUpWithInvitation: (data: InvitedSignUpData) => Promise<void>;
  verifyInvitation: (token: string, invitationId: string) => Promise<VerifyInvitationResult>;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
};

// MARK: - Context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// MARK: - Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // MARK: - Auth State
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { session } = await getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Set up interval to refresh session
    const refreshInterval = setInterval(async () => {
      const { session } = await refreshSession();
      setUser(session?.user ?? null);
    }, 1000 * 60 * 60); // Refresh every hour

    return () => clearInterval(refreshInterval);
  }, []);

  // MARK: - Auth Methods
  const handleSignUp = async (data: SignUpData) => {
    try {
      const result = await signUp(data);
      
      if (result.error) throw result.error;

      toast({
        title: 'Success!',
        description: 'Please check your email to verify your account.',
      });

      router.push('/verify-email');
    } catch (error) {
      const authError = error as AuthError;
      toast({
        variant: 'destructive',
        title: 'Error',
        description: authError.message || 'Failed to sign up',
      });
      throw error;
    }
  };

  const handleSignUpWithInvitation = async (data: InvitedSignUpData) => {
    try {
      const result = await signUpWithInvitation(data);
      
      if (result.error) throw result.error;

      toast({
        title: 'Success!',
        description: 'Please check your email to verify your account.',
      });

      router.push('/verify-email');
    } catch (error) {
      const authError = error as AuthError;
      toast({
        variant: 'destructive',
        title: 'Error',
        description: authError.message || 'Failed to sign up',
      });
      throw error;
    }
  };

  const handleVerifyInvitation = async (token: string, invitationId: string) => {
    try {
      const result = await verifyInvitation(token, invitationId);
      
      if (result.error) throw result.error;

      return result;
    } catch (error) {
      const authError = error as AuthError;
      toast({
        variant: 'destructive',
        title: 'Error',
        description: authError.message || 'Failed to verify invitation',
      });
      throw error;
    }
  };

  const handleLogin = async (data: LoginData) => {
    try {
      const result = await signIn(data);
      
      if (result.error) throw result.error;

      router.push('/feed');
      toast({
        title: 'Welcome back!',
        description: 'Successfully logged in.',
      });
    } catch (error) {
      const authError = error as AuthError;
      toast({
        variant: 'destructive',
        title: 'Error',
        description: authError.message || 'Failed to log in',
      });
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      const result = await signOut();
      
      if (result.error) throw result.error;

      router.push('/login');
      toast({
        title: 'Goodbye!',
        description: 'Successfully logged out.',
      });
    } catch (error) {
      const authError = error as AuthError;
      toast({
        variant: 'destructive',
        title: 'Error',
        description: authError.message || 'Failed to log out',
      });
      throw error;
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      const result = await resetPassword(email);
      
      if (result.error) throw result.error;

      toast({
        title: 'Success!',
        description: 'Please check your email for password reset instructions.',
      });
    } catch (error) {
      const authError = error as AuthError;
      toast({
        variant: 'destructive',
        title: 'Error',
        description: authError.message || 'Failed to send reset password email',
      });
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signUp: handleSignUp,
        signUpWithInvitation: handleSignUpWithInvitation,
        verifyInvitation: handleVerifyInvitation,
        login: handleLogin,
        logout: handleLogout,
        resetPassword: handleResetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// MARK: - Hook
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 