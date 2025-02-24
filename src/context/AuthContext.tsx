'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User, Session } from '@supabase/supabase-js'
import { toast } from '@/components/ui/use-toast'
import { 
  signUp, 
  signOut, 
  resetPassword, 
  verifyInvitation,
  signUpWithInvitation,
  type SignUpData,
  type InvitedSignUpData,
  type VerifyInvitationResult,
  type SignInData
} from '@/app/actions/auth'
import { showVerificationToast } from '@/components/VerificationToast'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// MARK: - Types
type AuthError = {
  message: string
  code?: string
}

type AuthContextType = {
  currentUser: User | null
  session: Session | null
  loading: boolean
  signUp: (data: SignUpData) => Promise<void>
  signUpWithInvitation: (data: InvitedSignUpData) => Promise<void>
  verifyInvitation: (token: string, invitationId: string) => Promise<VerifyInvitationResult>
  login: (data: SignInData, redirect?: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
}

// MARK: - Context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// MARK: - Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

  // MARK: - Auth State
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('Checking initial session...');
        
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          // Verify user with server-side validation
          const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser(session.access_token);
          if (userError) throw userError;

          setUser(verifiedUser);
          setSession(session);
          
          // Show verification toast if user exists but email is not confirmed
          if (verifiedUser && !verifiedUser.email_confirmed_at) {
            showVerificationToast();
          }
        } else {
          // No session found, clear state
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        // On error, clear state and ensure user is logged out
        setUser(null);
        setSession(null);
        await supabase.auth.signOut();
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', { event, userId: session?.user?.id });
      
      if (session) {
        // On new session, verify user server-side
        try {
          const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser(session.access_token);
          if (userError) throw userError;
          
          setUser(verifiedUser);
          setSession(session);
        } catch (error) {
          console.error('Error verifying user on auth state change:', error);
          setUser(null);
          setSession(null);
        }
      } else {
        setUser(null);
        setSession(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // MARK: - Auth Methods
  const handleSignUp = async (data: SignUpData) => {
    try {
      const result = await signUp(data)
      
      if (result.error) throw result.error

      // Always show email verification message and redirect to verify-email page
      toast({
        title: 'Success!',
        description: 'Please check your email to verify your account.',
      })
      
      // Ensure cookies are set before navigation
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Use window.location for a hard redirect to ensure middleware picks up the state
      window.location.href = '/verify-email'
    } catch (error) {
      const authError = error as AuthError
      toast({
        variant: 'destructive',
        title: 'Error',
        description: authError.message || 'Failed to sign up',
      })
      throw error
    }
  }

  const handleSignUpWithInvitation = async (data: InvitedSignUpData) => {
    try {
      const result = await signUpWithInvitation(data)
      
      if (result.error) throw result.error

      toast({
        title: 'Success!',
        description: 'Please check your email to verify your account.',
      })

      router.push('/verify-email')
    } catch (error) {
      const authError = error as AuthError
      toast({
        variant: 'destructive',
        title: 'Error',
        description: authError.message || 'Failed to sign up',
      })
      throw error
    }
  }

  const handleVerifyInvitation = async (token: string, invitationId: string) => {
    try {
      const result = await verifyInvitation(token, invitationId)
      
      if (result.error) throw result.error

      return result
    } catch (error) {
      const authError = error as AuthError
      toast({
        variant: 'destructive',
        title: 'Error',
        description: authError.message || 'Failed to verify invitation',
      })
      throw error
    }
  }

  const handleLogin = async (data: SignInData, redirect: string = '/family-tree') => {
    try {
      console.log('=== Login Flow Start ===');
      
      // First ensure no existing session
      await supabase.auth.signOut();
      
      // Use Supabase client directly for sign in
      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      // Handle authentication errors
      if (error) {
        console.error('Login error:', error);
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // Validate session and user data
      if (!authData?.session || !authData?.user) {
        console.error('No user or session data returned');
        toast({
          title: "Error",
          description: "Failed to establish session",
          variant: "destructive",
        });
        return;
      }

      // Verify user with server-side validation
      const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser(authData.session.access_token);
      if (userError || !verifiedUser) {
        throw new Error('Failed to verify user authentication');
      }

      // Check if email is verified using verified user data
      if (!verifiedUser.email_confirmed_at) {
        console.log('Email not verified, redirecting to verification page');
        window.location.href = '/verify-email';
        return;
      }

      // Get fresh session after verification
      const { data: { session: latestSession }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !latestSession) {
        throw new Error('Failed to retrieve latest session');
      }

      // Ensure session is valid and matches verified user
      if (latestSession.user.id !== verifiedUser.id) {
        throw new Error('Session user mismatch');
      }

      // Update auth state with verified data
      setUser(verifiedUser);
      setSession(latestSession);

      // Show success toast
      toast({
        title: "Success",
        description: "Successfully logged in!",
      });

      // Prepare redirect path
      const targetPath = redirect.startsWith('/') ? redirect : `/${redirect}`;
      console.log('Redirecting to:', targetPath);
      
      // Ensure cookies are set before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Force a hard navigation to ensure middleware runs with fresh session
      window.location.href = targetPath;
      
      console.log('=== Login Flow Complete ===');
    } catch (error) {
      console.error('Login flow error:', error);
      // Ensure clean state on error
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      
      toast({
        title: "Error",
        description: "An unexpected error occurred during login",
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    try {
      const result = await signOut()
      
      if (result.error) throw result.error

      router.push('/login')
      toast({
        title: 'Goodbye!',
        description: 'Successfully logged out.',
      })
    } catch (error) {
      const authError = error as AuthError
      toast({
        variant: 'destructive',
        title: 'Error',
        description: authError.message || 'Failed to log out',
      })
      throw error
    }
  }

  const handleResetPassword = async (email: string) => {
    try {
      const result = await resetPassword(email)
      
      if (result.error) throw result.error

      toast({
        title: 'Success!',
        description: 'Please check your email for password reset instructions.',
      })
    } catch (error) {
      const authError = error as AuthError
      toast({
        variant: 'destructive',
        title: 'Error',
        description: authError.message || 'Failed to send reset password email',
      })
      throw error
    }
  }

  return (
    <AuthContext.Provider
      value={{
        currentUser: user,
        session: session,
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
  )
}

// MARK: - Hook
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 