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
  
  // Create Supabase client
  const supabase = createClient()

  // MARK: - Session Restoration from Storage
  useEffect(() => {
    // Attempt to restore auth state from localStorage if available
    const savedSession = typeof window !== 'undefined' 
      ? localStorage.getItem('supabase.auth.token') 
      : null;
      
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed?.currentSession?.access_token && parsed?.currentSession?.refresh_token) {
          console.log('Found saved session in localStorage');
        }
      } catch (e) {
        console.warn('Failed to parse saved session from localStorage:', e);
      }
    }
  }, []);

  // MARK: - Auth State
  useEffect(() => {
    const checkSession = async () => {
      try {
        console.log('Checking initial session...');
        
        // Get initial session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session) {
          console.log('Session found, validating user...', {
            hasAccessToken: !!session.access_token,
            hasRefreshToken: !!session.refresh_token,
            expiresAt: session.expires_at
          });
          
          // First, try to get user directly with access token
          try {
            const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
            
            if (!userError && verifiedUser) {
              console.log('User verified successfully');
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
                  localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
                } catch (storageError) {
                  console.warn('Failed to save session to localStorage:', storageError);
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
            console.warn('First validation attempt failed, trying alternative method:', firstAttemptError);
          }
          
          // If that fails, try refreshing the session with more robust error handling
          try {
            console.log('Attempting to refresh session...');
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
            
            if (refreshError) {
              console.warn('Session refresh error:', refreshError);
              // Instead of throwing, we'll try to recover
              if (refreshError.message?.includes('expired')) {
                // Handle expired token case
                console.log('Token expired, clearing session');
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
                console.log('Session refreshed successfully');
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
                    localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
                  } catch (storageError) {
                    console.warn('Failed to save refreshed session to localStorage:', storageError);
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
              console.log('No session after refresh attempt, clearing state');
              setUser(null);
              setSession(null);
            }
          } catch (refreshError) {
            console.warn('Session refresh failed:', refreshError);
            // Continue to cleanup instead of throwing
          }
          
          // If we get here, we couldn't validate the user, so clear the session
          console.warn('Could not validate user session, signing out');
          try {
            await supabase.auth.signOut({ scope: 'local' });
            if (typeof window !== 'undefined') {
              localStorage.removeItem('supabase.auth.token');
            }
          } catch (signOutError) {
            console.error('Error during signOut:', signOutError);
            // Continue even if signOut fails
          }
          setUser(null);
          setSession(null);
        } else {
          // No session found, clear state
          console.log('No session found');
          setUser(null);
          setSession(null);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        // On error, clear state and ensure user is logged out
        setUser(null);
        setSession(null);
        try {
          await supabase.auth.signOut({ scope: 'local' });
          if (typeof window !== 'undefined') {
            localStorage.removeItem('supabase.auth.token');
          }
        } catch (signOutError) {
          console.error('Error during error cleanup signOut:', signOutError);
        }
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
          const { data: { user: verifiedUser }, error: userError } = await supabase.auth.getUser();
          
          if (userError) {
            console.warn('Error verifying user on auth state change, trying refresh:', userError);
            
            // Try refreshing the session with better error handling
            try {
              const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError) {
                console.warn('Session refresh error during auth state change:', refreshError);
                
                // Handle specific error cases
                if (refreshError.message?.includes('expired') || refreshError.message?.includes('invalid')) {
                  console.log('Token issues during refresh, clearing session');
                  await supabase.auth.signOut({ scope: 'local' });
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('supabase.auth.token');
                  }
                  setUser(null);
                  setSession(null);
                  return;
                }
                
                // Don't throw - fallback to our recovery logic below
              }
              
              if (refreshedSession) {
                // Try getting user again
                const { data: { user: refreshedUser }, error: refreshedUserError } = await supabase.auth.getUser();
                
                if (!refreshedUserError && refreshedUser) {
                  console.log('Successfully recovered session after refresh');
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
                      localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
                    } catch (storageError) {
                      console.warn('Failed to save refreshed session to localStorage:', storageError);
                    }
                  }
                  
                  return;
                }
              }
              
              // If we get here, refresh didn't help - clear state
              console.warn('Could not recover session through refresh');
              setUser(null);
              setSession(null);
              await supabase.auth.signOut({ scope: 'local' });
              if (typeof window !== 'undefined') {
                localStorage.removeItem('supabase.auth.token');
              }
              
            } catch (refreshAttemptError) {
              console.error('Error during session refresh attempt:', refreshAttemptError);
              // Continue to cleanup
              setUser(null);
              setSession(null);
              await supabase.auth.signOut({ scope: 'local' });
              if (typeof window !== 'undefined') {
                localStorage.removeItem('supabase.auth.token');
              }
            }
          } else {
            setUser(verifiedUser);
            setSession(session);
            
            // Save session to localStorage on successful auth state change
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
                localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
              } catch (storageError) {
                console.warn('Failed to save session to localStorage during auth change:', storageError);
              }
            }
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
          // On critical errors, clear state and sign out
          setUser(null);
          setSession(null);
          
          // Attempt to sign out to clear any invalid tokens
          try {
            await supabase.auth.signOut({ scope: 'local' });
            if (typeof window !== 'undefined') {
              localStorage.removeItem('supabase.auth.token');
            }
          } catch (signOutError) {
            console.error('Error signing out after auth state change error:', signOutError);
          }
        }
      } else {
        setUser(null);
        setSession(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('supabase.auth.token');
        }
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
      
      // Use server action for login instead of direct client auth
      const result = await signIn(data);
      
      if (result.error) {
        throw result.error;
      }
      
      if (!result.user) {
        throw new Error('No user returned from login');
      }
      
      if (!result.session) {
        throw new Error('No session returned from login');
      }
      
      // Update local state immediately with the session and user
      setUser(result.user);
      setSession(result.session);
      
      // Manually save session to localStorage for redundancy
      if (typeof window !== 'undefined' && result.user && result.user.id && result.user.email) {
        try {
          const sessionData = {
            currentSession: {
              access_token: result.session.access_token,
              refresh_token: result.session.refresh_token,
              expires_at: result.session.expires_at,
              user: { id: result.user.id, email: result.user.email }
            }
          };
          localStorage.setItem('supabase.auth.token', JSON.stringify(sessionData));
          console.log('Saved new session to localStorage after login');
        } catch (storageError) {
          console.warn('Failed to save session to localStorage after login:', storageError);
        }
      }
      
      // Check email verification status
      if (!result.user.email_confirmed_at) {
        console.log('Email not verified, redirecting to verification page');
        toast({
          title: "Verification Required",
          description: "Please verify your email address before logging in",
        });
        router.push('/verify-email');
        return;
      }

      // Show success toast
      toast({
        title: "Success",
        description: "Successfully logged in!",
      });
      
      // Route to the specified redirect path
      console.log('Login successful, redirecting to:', redirect);
      router.push(redirect);
    } catch (error) {
      console.error('Login error:', error);
      const authError = error as AuthError;
      if (authError.code === 'email_not_confirmed') {
        showVerificationToast();
      } else {
        toast({
          title: "Login failed",
          description: authError.message || 'Something went wrong',
          variant: "destructive",
        });
      }
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