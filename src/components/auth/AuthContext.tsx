'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { User, Session } from '@supabase/supabase-js'
import { toast } from '@/components/ui/use-toast'
import { 
  authService,
  type SignUpData,
  type InvitedSignUpData,
  type VerifyInvitationResult,
  type SignInData,
} from '@/lib/client/services/auth'
import { showVerificationToast } from '@/components/VerificationToast'
import { createClient } from '@/lib/supabase'
import { createLogger } from '@/lib/client/logger'
import { SupabaseClient } from '@supabase/supabase-js'
import { AuthResponse } from './AuthForm'

// Create a logger for AuthContext
const logger = createLogger('AuthContext')

// MARK: - Types
type AuthError = {
  message: string
  code?: string
  details?: string
}

type AuthContextType = {
  currentUser: User | null
  session: Session | null
  loading: boolean
  signUp: (data: SignUpData) => Promise<AuthResponse>
  signUpWithInvitation: (data: InvitedSignUpData) => Promise<void>
  verifyInvitation: (token: string, invitationId: string) => Promise<VerifyInvitationResult>
  login: (data: SignInData, redirect?: string) => Promise<void>
  logout: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  refreshUser: () => Promise<void>
}

// MARK: - Context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// MARK: - Provider
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  
  // Create Supabase client
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  // Initialize Supabase client
  useEffect(() => {
    try {
      logger.debug('Initializing Supabase client');
      const client = createClient();
      setSupabase(client);
      
      logger.debug('Supabase client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Supabase client', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }, []);

  // MARK: - Session Management
  useEffect(() => {
    // Skip if Supabase client is not initialized
    if (!supabase) {
      logger.debug('Skipping session check - Supabase client not initialized');
      return;
    }
    
    const checkSession = async () => {
      try {
        logger.debug('Checking initial session...')
        
        // Get initial session using the updated auth service
        const { session, user: verifiedUser, error: sessionError } = await authService.getSession();
        if (sessionError) throw sessionError;

        if (session && verifiedUser) {
          logger.debug('Session found and user verified', {
            hasAccessToken: !!session.access_token,
            hasRefreshToken: !!session.refresh_token,
            expiresAt: session.expires_at,
            userId: verifiedUser.id
          });
          
          setUser(verifiedUser);
          setSession(session);
          
          // Show verification toast if user exists but email is not confirmed
          if (!verifiedUser.email_confirmed_at) {
            showVerificationToast();
          }
        } else if (session) {
          // Session exists but couldn't get user, try session refresh
          logger.debug('Attempting to refresh session...');
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            logger.warn('Session refresh error', { error: refreshError.message });
            setUser(null);
            setSession(null);
          } else if (refreshedSession) {
            const { data: { user: refreshedUser } } = await supabase.auth.getUser();
            
            if (refreshedUser) {
              logger.info('Session refreshed successfully', { userId: refreshedUser.id });
              setUser(refreshedUser);
              setSession(refreshedSession);
              
              if (!refreshedUser.email_confirmed_at) {
                showVerificationToast();
              }
            }
          } else {
            // No session after refresh
            logger.info('No valid session after refresh attempt');
            setUser(null);
            setSession(null);
          }
        } else {
          // No session found
          logger.info('No session found');
          setUser(null);
          setSession(null);
        }
      } catch (e) {
        logger.error('Error checking session', {
          error: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined
        });
        setUser(null);
        setSession(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Set up auth state change listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug('Auth state changed', { event });
      
      // Update local state based on auth events
      // @supabase/ssr handles persistence automatically
      switch (event) {
        case 'SIGNED_IN':
          if (session) {
            logger.debug('User signed in');
            setUser(session.user);
            setSession(session);
          }
          break;
          
        case 'SIGNED_OUT':
          logger.debug('User signed out');
          setUser(null);
          setSession(null);
          break;
          
        case 'TOKEN_REFRESHED':
          if (session) {
            logger.debug('Token refreshed automatically');
            setUser(session.user);
            setSession(session);
          }
          break;
          
        case 'USER_UPDATED':
          if (session) {
            logger.debug('User updated');
            setUser(session.user);
          }
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // MARK: - Auth Methods
  
  /**
   * Handle sign up
   * @param data - Sign up data
   */
  const handleSignUp = async (data: SignUpData): Promise<AuthResponse> => {
    setLoading(true)

    try {
      logger.debug('Signing up user', { email: data.email })
      
      const result = await authService.signUp(data)
      
      if (result.error) {
        logger.error('Sign up error', { 
          error: result.error.message,
          code: result.error.code
        })
        
        setLoading(false)
        return {
          success: false,
          error: result.error
        }
      }
      
      // Check if email verification is needed
      const needsEmailVerification = !result.user?.email_confirmed_at
      
      if (needsEmailVerification) {
        logger.debug('Email verification required')
        showVerificationToast()
      } else {
        // If no email verification needed, refresh session
        await refreshUser()
      }
      
      setLoading(false)
      return {
        success: true,
        needsEmailVerification
      }
    } catch (error) {
      logger.error('Unexpected sign up error', { 
        error: error instanceof Error ? error.message : String(error)
      })
      
      setLoading(false)
      return {
        success: false,
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      }
    }
  }
  
  /**
   * Handle sign up with invitation
   * @param data - Invited sign up data
   */
  const handleSignUpWithInvitation = async (data: InvitedSignUpData): Promise<void> => {
    try {
      logger.debug('Signing up invited user', { email: data.email, invitationId: data.invitationId })
      
      const result = await authService.signUpWithInvitation(data)
      
      if (result.error) {
        logger.error('Invited sign up error', {
          error: result.error.message
        })
        toast({
          title: 'Unable to sign up',
          description: result.error.message,
          variant: 'destructive',
        })
      } else {
        logger.info('Invited sign up successful', { 
          email: data.email,
          invitationId: data.invitationId
        })
        toast({
          title: 'Success',
          description: 'Your account has been created. You may need to verify your email.',
        })
      }
    } catch (err) {
      const error = err as AuthError
      logger.error('Unexpected invited sign up error', {
        error: error.message,
        stack: err instanceof Error ? err.stack : undefined
      })
      
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred during sign up.',
        variant: 'destructive',
      })
      
      throw error
    }
  }
  
  /**
   * Handle invitation verification
   * @param token - Verification token
   * @param invitationId - Invitation ID
   */
  const handleVerifyInvitation = async (token: string, invitationId: string): Promise<VerifyInvitationResult> => {
    try {
      logger.debug('Verifying invitation', { invitationId })
      
      const result = await authService.verifyInvitation(token, invitationId)
      
      if (result.error) {
        logger.error('Invitation verification error', {
          error: result.error.message
        })
        toast({
          title: 'Invalid Invitation',
          description: result.error.message,
          variant: 'destructive',
        })
      } else {
        logger.info('Invitation verified successfully', { 
          invitationId,
          inviteeEmail: result.inviteeEmail
        })
      }
      
      return result
    } catch (err) {
      const error = err as AuthError
      logger.error('Unexpected invitation verification error', {
        error: error.message,
        stack: err instanceof Error ? err.stack : undefined
      })
      
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred verifying the invitation.',
        variant: 'destructive',
      })
      
      throw error
    }
  }
  
  /**
   * Handle user sign in
   * @param data - Sign in credentials
   * @param redirect - Optional path to redirect to after sign in
   */
  const handleSignIn = async (data: SignInData, redirect?: string): Promise<void> => {
    setLoading(true)
    
    try {
      logger.debug('Signing in user', { 
        email: data.email.substring(0, 3) + '***' + data.email.split('@')[1] 
      })
      
      // Use auth service
      const result = await authService.signIn(data)
      
      if (result.error) {
        throw result.error
      }
      
      // If we have a session, update the local state
      if (result.session) {
        // Get user from session
        const { data: userData } = await supabase?.auth.getUser() || {}
        
        if (userData?.user) {
          setUser(userData.user)
          setSession(result.session)
          
          // Log successful sign in
          logger.info('User signed in successfully', { 
            userId: userData.user.id,
            emailVerified: !!userData.user.email_confirmed_at
          })
          
          // Check if email is verified and show toast if not
          if (!userData.user.email_confirmed_at) {
            showVerificationToast()
          }
          
          // Redirect if specified, otherwise go to default route
          if (redirect) {
            router.push(redirect)
          } else {
            router.push('/family-tree')
          }
        } else {
          throw new Error('Failed to get user data after sign in')
        }
      } else {
        throw new Error('No session returned from sign in')
      }
    } catch (error: unknown) {
      logger.error('Sign in error', { 
        error: error instanceof Error ? error.message : String(error) 
      })
      
      // Format error for toast
      const errorMsg = error instanceof Error ? error.message : 'Invalid email or password'
      
      // Show error toast
      toast({
        title: 'Sign in failed',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }
  
  /**
   * Handle sign out (logout)
   */
  const handleSignOut = async (): Promise<void> => {
    try {
      logger.debug('Logging out user', { userId: user?.id });
      
      const result = await authService.signOut();
      
      if (result.error) {
        logger.error('Logout error', {
          error: result.error.message
        });
        toast({
          title: 'Unable to sign out',
          description: result.error.message,
          variant: 'destructive',
        });
        return;
      }
      
      // User is now signed out - @supabase/ssr handles clearing the session
      logger.info('User logged out successfully');
      router.push('/login');
    } catch (err) {
      const error = err as AuthError;
      logger.error('Unexpected logout error', {
        error: error.message,
        stack: err instanceof Error ? err.stack : undefined
      });
      
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred during sign out.',
        variant: 'destructive',
      });
      
      throw error;
    }
  }
  
  /**
   * Handle password reset
   * @param email - User email
   */
  const handleResetPassword = async (email: string): Promise<void> => {
    try {
      logger.debug('Requesting password reset', { email })
      
      const result = await authService.resetPassword(email)
      
      if (result.error) {
        logger.error('Password reset error', {
          error: result.error.message
        })
        toast({
          title: 'Unable to reset password',
          description: result.error.message,
          variant: 'destructive',
        })
        return
      }
      
      // Password reset email sent
      logger.info('Password reset email sent', { email })
      toast({
        title: 'Password Reset Email Sent',
        description: 'Check your email for a password reset link.',
      })
    } catch (err) {
      const error = err as AuthError
      logger.error('Unexpected password reset error', {
        error: error.message,
        stack: err instanceof Error ? err.stack : undefined
      })
      
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred requesting password reset.',
        variant: 'destructive',
      })
      
      throw error
    }
  }

  /**
   * Refresh user data
   */
  const refreshUser = async () => {
    if (!supabase) return;
    
    try {
      logger.debug('Refreshing user data')
      const { data } = await supabase.auth.getUser()
      setUser(data.user)
    } catch (error) {
      logger.error('Error refreshing user data', {
        error: error instanceof Error ? error.message : String(error)
      })
    }
  }
  
  return (
    <AuthContext.Provider
      value={{
        currentUser: user,
        session,
        loading,
        signUp: handleSignUp,
        signUpWithInvitation: handleSignUpWithInvitation,
        verifyInvitation: handleVerifyInvitation,
        login: handleSignIn,
        logout: handleSignOut,
        resetPassword: handleResetPassword,
        refreshUser
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Hook to use auth context
 * @returns Auth context value
 * @throws Error if used outside AuthProvider
 */
export function useAuth() {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
} 