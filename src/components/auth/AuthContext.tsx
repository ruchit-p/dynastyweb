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
  type SignInData,
  signIn
} from '@/app/actions/auth'
import { showVerificationToast } from '@/components/VerificationToast'
import { createClient } from '@/lib/client/supabase-browser'
import { createLogger } from '@/lib/client/logger'
import { SupabaseClient } from '@supabase/supabase-js'
import { AuthResponse } from './AuthForm'

// Create a logger for AuthContext
const logger = createLogger('AuthContext')

// MARK: - Types
type AuthError = {
  message: string
  code?: string
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
      
      // Also set a global object for emergencies
      if (typeof window !== 'undefined') {
        (window as Window & { __supabaseClient?: SupabaseClient }).__supabaseClient = client;
      }
      
      logger.debug('Supabase client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize Supabase client', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }, []);

  // MARK: - Session Restoration from Storage
  useEffect(() => {
    // Skip if Supabase client is not initialized
    if (!supabase) {
      logger.debug('Skipping session check - Supabase client not initialized');
      return;
    }
    
    // Try to get session from localStorage first for quicker loading
    try {
      const savedSession = localStorage.getItem('supabase.auth.session')
      if (savedSession) {
        logger.debug('Found saved session in localStorage')
        const parsed = JSON.parse(savedSession);
        if (parsed?.currentSession?.access_token && parsed?.currentSession?.refresh_token) {
          console.log('Found saved session in localStorage');
        }
      }
    } catch (e) {
      logger.warn('Failed to parse saved session from localStorage', {
        error: e instanceof Error ? e.message : String(e)
      })
    }

    const checkSession = async () => {
      try {
        logger.debug('Checking initial session...')
        
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          logger.debug('Session found, validating user...', {
            hasAccessToken: !!session.access_token,
            hasRefreshToken: !!session.refresh_token,
            expiresAt: session.expires_at
          });
          
          // First, try to get user directly with access token
          try {
            const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
            
            if (!userError && verifiedUser) {
              logger.info('User verified successfully', {
                userId: verifiedUser.id,
                emailVerified: !!verifiedUser.email_confirmed_at
              })
              setUser(verifiedUser);
              setSession(session);
              
              // Manually save to localStorage for redundancy
              if (typeof window !== 'undefined' && verifiedUser && verifiedUser.id && verifiedUser.email) {
                try {
                  const sessionData = {
                    currentSession: {
                      access_token: session.access_token,
                      refresh_token: session.refresh_token,
                      expires_at: session.expires_at,
                      user: { id: verifiedUser.id, email: verifiedUser.email }
                    }
                  };
                  localStorage.setItem('supabase.auth.session', JSON.stringify(sessionData));
                  logger.debug('Saved new session to localStorage after login');
                } catch (storageError) {
                  logger.warn('Failed to save session to localStorage', {
                    error: storageError instanceof Error ? storageError.message : String(storageError)
                  });
                }
              }
              
              // Show verification toast if user exists but email is not confirmed
              if (!verifiedUser.email_confirmed_at) {
                showVerificationToast();
              }
              setLoading(false);
              return;
            }
          } catch (firstAttemptError) {
            logger.warn('First validation attempt failed, trying alternative method', {
              error: firstAttemptError instanceof Error ? firstAttemptError.message : String(firstAttemptError)
            });
          }
          
          // If that fails, try refreshing the session with more robust error handling
          try {
            logger.debug('Attempting to refresh session...');
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              logger.warn('Session refresh error', {
                error: refreshError.message
              });
              // Instead of throwing, we'll try to recover
              if (refreshError.message?.includes('expired')) {
                // Handle expired token case
                logger.info('Token expired, clearing session');
                await supabase.auth.signOut({ scope: 'local' });
                setUser(null);
                setSession(null);
                setLoading(false);
                return;
              }
            }
            
            if (refreshedSession) {
              const { data: { user: refreshedUser }, error: refreshedUserError } = await supabase.auth.getUser();
              
              if (!refreshedUserError && refreshedUser) {
                logger.info('Session refreshed successfully', {
                  userId: refreshedUser.id
                });
                setUser(refreshedUser);
                setSession(refreshedSession);
                
                // Save refreshed session to localStorage
                if (typeof window !== 'undefined' && refreshedUser && refreshedUser.id && refreshedUser.email) {
                  try {
                    const sessionData = {
                      currentSession: {
                        access_token: refreshedSession.access_token,
                        refresh_token: refreshedSession.refresh_token,
                        expires_at: refreshedSession.expires_at,
                        user: { id: refreshedUser.id, email: refreshedUser.email }
                      }
                    };
                    localStorage.setItem('supabase.auth.session', JSON.stringify(sessionData));
                    logger.debug('Saved refreshed session to localStorage');
                  } catch (storageError) {
                    logger.warn('Failed to save refreshed session to localStorage', {
                      error: storageError instanceof Error ? storageError.message : String(storageError)
                    });
                  }
                }
                
                if (!refreshedUser.email_confirmed_at) {
                  showVerificationToast();
                }
                setLoading(false);
                return;
              }
            } else {
              // No refreshed session but no error - this is a valid case
              logger.info('No session after refresh attempt, clearing state');
              setUser(null);
              setSession(null);
            }
          } catch (refreshError) {
            logger.warn('Session refresh failed', {
              error: refreshError instanceof Error ? refreshError.message : String(refreshError)
            });
            // Continue to cleanup instead of throwing
          }
          
          // If we get here, we couldn't validate the user, so clear the session
          logger.warn('Could not validate user session, signing out');
          try {
            await supabase.auth.signOut({ scope: 'local' });
            if (typeof window !== 'undefined') {
              localStorage.removeItem('supabase.auth.session');
            }
          } catch (signOutError) {
            logger.error('Error during signOut', {
              error: signOutError instanceof Error ? signOutError.message : String(signOutError)
            });
            // Continue even if signOut fails
          }
          setUser(null);
          setSession(null);
        } else {
          // No session found, clear state
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
      logger.debug('Auth state changed', { event })
      
      if (event === 'SIGNED_IN' && session) {
        setUser(session.user)
        setSession(session)
      }
      
      if (event === 'SIGNED_OUT') {
        setUser(null)
        setSession(null)
        if (typeof window !== 'undefined') {
          localStorage.removeItem('supabase.auth.session')
        }
      }
      
      if (event === 'TOKEN_REFRESHED' && session) {
        logger.debug('Token refreshed automatically')
        setUser(session.user)
        setSession(session)
        
        // Save refreshed session to localStorage
        if (typeof window !== 'undefined' && session.user && session.user.id && session.user.email) {
          try {
            const sessionData = {
              currentSession: {
                access_token: session.access_token,
                refresh_token: session.refresh_token,
                expires_at: session.expires_at,
                user: { id: session.user.id, email: session.user.email }
              }
            };
            localStorage.setItem('supabase.auth.session', JSON.stringify(sessionData));
            logger.debug('Saved refreshed session to localStorage from event handler');
          } catch (storageError) {
            logger.warn('Failed to save refreshed session to localStorage', {
              error: storageError instanceof Error ? storageError.message : String(storageError)
            });
          }
        }
      }
      
      if (event === 'USER_UPDATED' && session) {
        logger.debug('User updated')
        setUser(session.user)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router]);

  // MARK: - Auth Methods
  
  /**
   * Handle sign up
   * @param data - Sign up data
   */
  const handleSignUp = async (data: SignUpData): Promise<AuthResponse> => {
    try {
      logger.debug('Signing up user', { email: data.email })
      
      const result = await signUp(data)
      
      if (result.error) {
        logger.error('Sign up error', {
          error: result.error.message,
          code: result.error.code
        })
        toast({
          title: 'Unable to sign up',
          description: result.error.message,
          variant: 'destructive',
        })
      } else if (result.needsEmailVerification) {
        logger.info('Sign up successful, email verification required', { 
          email: data.email 
        })
        toast({
          title: 'Verification required',
          description: 'We sent you an email with a verification link. Please check your inbox.',
        })
      }
      
      return result
    } catch (err) {
      const error = err as AuthError
      logger.error('Unexpected sign up error', {
        error: error.message,
        code: error.code,
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
   * Handle sign up with invitation
   * @param data - Invited sign up data
   */
  const handleSignUpWithInvitation = async (data: InvitedSignUpData): Promise<void> => {
    try {
      logger.debug('Signing up invited user', { email: data.email, invitationId: data.invitationId })
      
      const result = await signUpWithInvitation(data)
      
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
      
      const result = await verifyInvitation(token, invitationId)
      
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
          email: result.inviteeEmail
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
   * Handle sign in (login)
   * @param data - Sign in data
   * @param redirect - Optional redirect path
   */
  const handleSignIn = async (data: SignInData, redirect?: string): Promise<void> => {
    try {
      logger.debug('Logging in user', { email: data.email })
      
      const result = await signIn(data)
      
      if (result.error) {
        logger.error('Login error', {
          error: result.error.message,
          code: result.error.code
        })
        toast({
          title: 'Unable to sign in',
          description: result.error.message,
          variant: 'destructive',
        })
        return
      }
      
      // User is now signed in
      logger.info('User logged in successfully', { email: data.email })
      
      if (redirect) {
        router.push(redirect)
      }
    } catch (err) {
      const error = err as AuthError
      logger.error('Unexpected login error', {
        error: error.message,
        code: error.code,
        stack: err instanceof Error ? err.stack : undefined
      })
      
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred during sign in.',
        variant: 'destructive',
      })
      
      throw error
    }
  }
  
  /**
   * Handle sign out (logout)
   */
  const handleSignOut = async (): Promise<void> => {
    try {
      logger.debug('Logging out user', { userId: user?.id })
      
      const result = await signOut()
      
      if (result.error) {
        logger.error('Logout error', {
          error: result.error.message
        })
        toast({
          title: 'Unable to sign out',
          description: result.error.message,
          variant: 'destructive',
        })
        return
      }
      
      // User is now signed out
      logger.info('User logged out successfully')
      router.push('/login')
    } catch (err) {
      const error = err as AuthError
      logger.error('Unexpected logout error', {
        error: error.message,
        stack: err instanceof Error ? err.stack : undefined
      })
      
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred during sign out.',
        variant: 'destructive',
      })
      
      throw error
    }
  }
  
  /**
   * Handle password reset
   * @param email - User email
   */
  const handleResetPassword = async (email: string): Promise<void> => {
    try {
      logger.debug('Requesting password reset', { email })
      
      const result = await resetPassword(email)
      
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