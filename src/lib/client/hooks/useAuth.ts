import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { type User } from '@supabase/supabase-js'
import { toast } from '@/components/ui/use-toast'
import {
  signUp,
  signIn,
  signOut,
  resetPassword,
  getSession,
  refreshSession,
  verifyInvitation,
  signUpWithInvitation,
  type SignUpData,
  type InvitedSignUpData,
} from '@/app/actions/auth'

// MARK: - Types
type AuthError = {
  message: string
}

type LoginData = {
  email: string
  password: string
}

type PrefillData = {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: string;
  phoneNumber?: string;
  relationship?: string;
}

type VerifyInvitationResult = {
  success: boolean;
  prefillData?: PrefillData;
  inviteeEmail?: string;
  error?: AuthError;
}

// MARK: - Hook
export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  // MARK: - Auth State
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { session } = await getSession()
        setUser(session?.user ?? null)
      } catch (error) {
        console.error('Error checking session:', error)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Set up interval to refresh session
    const refreshInterval = setInterval(async () => {
      const { session } = await refreshSession()
      setUser(session?.user ?? null)
    }, 1000 * 60 * 60) // Refresh every hour

    return () => clearInterval(refreshInterval)
  }, [])

  // MARK: - Auth Methods
  const handleSignUp = useCallback(async (data: SignUpData) => {
    try {
      const result = await signUp(data)
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
  }, [router])

  const handleSignUpWithInvitation = useCallback(async (data: InvitedSignUpData) => {
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
  }, [router])

  const handleVerifyInvitation = useCallback(async (token: string, invitationId: string): Promise<VerifyInvitationResult> => {
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
  }, [])

  const handleLogin = useCallback(async (data: LoginData) => {
    try {
      const result = await signIn(data)
      if (result.error) throw result.error

      router.push('/feed')
      toast({
        title: 'Welcome back!',
        description: 'Successfully logged in.',
      })
    } catch (error) {
      const authError = error as AuthError
      toast({
        variant: 'destructive',
        title: 'Error',
        description: authError.message || 'Failed to log in',
      })
      throw error
    }
  }, [router])

  const handleLogout = useCallback(async () => {
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
        description: authError.message || 'Failed to send reset password email',
      })
      throw error
    }
  }, [router])

  const handleResetPassword = useCallback(async (email: string) => {
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
  }, [])

  return {
    user,
    loading,
    signUp: handleSignUp,
    signUpWithInvitation: handleSignUpWithInvitation,
    verifyInvitation: handleVerifyInvitation,
    login: handleLogin,
    logout: handleLogout,
    resetPassword: handleResetPassword,
  }
} 