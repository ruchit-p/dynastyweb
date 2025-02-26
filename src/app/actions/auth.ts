'use server'

import { redirect } from 'next/navigation'
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/server/supabase'
import logger from '@/lib/logger'
import { measureAsync } from '@/lib/performance'
import { User, Session } from '@supabase/supabase-js'
import * as authService from '@/lib/server/services/auth-service'

// MARK: - Types

export type AuthError = {
  message: string
  code?: string
  details?: string
}

export type SignUpData = {
  email: string
  password: string
  firstName: string
  lastName: string
  dateOfBirth: string
  gender: string
}

export type SignInData = {
  email: string
  password: string
}

export type InvitedSignUpData = SignUpData & {
  invitationId: string
  token: string
}

export type VerifyInvitationResult = {
  success: boolean
  prefillData?: {
    firstName: string
    lastName: string
    dateOfBirth?: Date
    gender?: string
    phoneNumber?: string
    relationship?: string
  }
  inviteeEmail?: string
  error?: AuthError
}

type ServerAction<Args extends unknown[], Return> = (...args: Args) => Promise<Return>

interface SignUpResult {
  success: boolean;
  user?: User | null;
  session?: Session | null;
  needsEmailVerification?: boolean;
  error?: AuthError;
}

/**
 * Formats error messages from Supabase
 */
function formatError(error: unknown): AuthError {
  console.error('Formatting error:', error)
  
  // Handle PostgrestError (database errors)
  if (error && typeof error === 'object' && 'code' in error && 'message' in error && 'details' in error) {
    const pgError = error as { code: string; message: string; details: string }
    logger.error({
      msg: 'Database error details',
      error: pgError.message,
      code: pgError.code,
      details: pgError.details,
      errorObject: JSON.stringify(error)
    })
    return {
      message: `Database error: ${pgError.message}`,
      code: pgError.code,
      details: pgError.details
    }
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    logger.error({
      msg: 'Error object details',
      error: error.message,
      code: (error as SupabaseAuthError).code,
      stack: error.stack,
      name: error.name
    })
    return {
      message: error.message,
      code: (error as SupabaseAuthError).code
    }
  }
  
  // Handle unknown error format
  logger.error({
    msg: 'Unknown error format',
    errorType: typeof error,
    errorString: JSON.stringify(error)
  })
  return {
    message: 'An unexpected error occurred',
    details: JSON.stringify(error)
  }
}

// MARK: - Auth Actions

/**
 * Signs up a new user and creates their profile
 */
export async function signUp(data: SignUpData): Promise<SignUpResult> {
  return await authService.createUser(data);
}

/**
 * Signs in a user with email and password
 */
export async function signIn(data: SignInData) {
  return await measureAsync('auth.signIn', async () => {
    try {
      logger.info({
        msg: 'Sign-in attempt',
        email: data.email
      })
      
      // Get Supabase client
      const supabase = await createClient()
      
      // Attempt sign in
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password
      })
      
      if (signInError || !authData.session) {
        logger.warn({
          msg: 'Sign-in failed',
          error: signInError?.message,
          code: signInError?.code,
          email: data.email
        })
        
        return {
          success: false,
          error: {
            message: signInError?.message || 'Invalid email or password',
            code: signInError?.code
          }
        }
      }
      
      logger.info({
        msg: 'Sign-in successful',
        userId: authData.user.id
      })
      
      return {
        success: true,
        user: authData.user,
        session: authData.session
      }
    } catch (error) {
      logger.error({
        msg: 'Error during sign-in',
        error: error instanceof Error ? error.message : String(error)
      })
      
      return {
        success: false,
        error: formatError(error)
      }
    }
  })
}

/**
 * Signs out the current user
 */
export async function signOut() {
  try {
    // Get Supabase client
    const supabase = await createClient()
    
    // Sign out the user
    await supabase.auth.signOut()
    
    redirect('/') // Redirect to home page
  } catch (error) {
    logger.error({
      msg: 'Error signing out',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      success: false,
      error: formatError(error)
    }
  }
}

/**
 * Sends a password reset email
 */
export async function resetPassword(email: string) {
  try {
    // Get Supabase client
    const supabase = await createClient()
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
    })
    
    if (error) {
      logger.error({
        msg: 'Password reset error',
        error: error.message,
        code: error.code
      })
      
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code
        }
      }
    }
    
    return { success: true }
  } catch (error) {
    logger.error({
      msg: 'Error sending password reset',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      success: false,
      error: formatError(error)
    }
  }
}

/**
 * Updates the user's password
 */
export async function updatePassword(newPassword: string) {
  try {
    // Get Supabase client
    const supabase = await createClient()
    
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })
    
    if (error) {
      logger.error({
        msg: 'Password update error',
        error: error.message,
        code: error.code
      })
      
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code
        }
      }
    }
    
    return { success: true }
  } catch (error) {
    logger.error({
      msg: 'Error updating password',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      success: false,
      error: formatError(error)
    }
  }
}

/**
 * Verifies a user's email with token
 */
export async function verifyEmail(token: string) {
  try {
    // Create a server client using the centralized function
    const supabase = await createClient()
    
    // Verify the email
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    })
    
    if (error) {
      logger.error({
        msg: 'Email verification error',
        error: error.message,
        code: error.code
      })
      
      return {
        success: false,
        error: {
          message: error.message,
          code: error.code
        }
      }
    }
    
    return { success: true }
  } catch (error) {
    logger.error({
      msg: 'Error verifying email',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      success: false,
      error: formatError(error)
    }
  }
}

/**
 * Verifies an invitation token and returns prefill data
 */
export async function verifyInvitation(token: string, invitationId: string) {
  try {
    const supabase = await createClient()
    
    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('invitations/verify', {
      method: 'POST',
      body: { token, invitationId }
    })
    
    if (error) {
      console.error('Edge Function error:', error)
      return {
        success: false,
        error: { message: error.message || 'Error verifying invitation' }
      }
    }
    
    if (!data.success) {
      return {
        success: false,
        error: { message: data.error || 'Invalid invitation' }
      }
    }
    
    return {
      success: true,
      prefillData: data.prefillData,
      inviteeEmail: data.inviteeEmail
    }
  } catch (error) {
    console.error('Verify invitation error:', error)
    return {
      success: false,
      error: formatError(error)
    }
  }
}

/**
 * Signs up a new user with an invitation
 */
export async function signUpWithInvitation(data: InvitedSignUpData) {
  try {
    const supabase = await createClient()

    // Verify invitation first using the Edge Function
    const verification = await verifyInvitation(data.token, data.invitationId)
    if (!verification.success) {
      throw verification.error
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          full_name: `${data.firstName} ${data.lastName}`,
          date_of_birth: data.dateOfBirth,
          gender: data.gender
        }
      }
    })

    if (authError) throw authError

    // Update invitation via the Edge Function
    const { error: updateError } = await supabase.functions.invoke('invitations/update', {
      method: 'POST',
      body: {
        id: data.invitationId,
        status: 'accepted',
        updatedFields: {
          accepted_at: new Date().toISOString(),
          user_id: authData.user?.id
        }
      }
    })
    
    if (updateError) {
      console.error('Failed to update invitation status:', updateError)
      // Continue anyway - the user account is created
    }

    return {
      success: true,
      user: authData.user
    }
  } catch (error) {
    console.error('Sign up with invitation error:', error)
    return {
      success: false,
      error: formatError(error)
    }
  }
}

/**
 * Gets the current authenticated user
 */
export async function getUser() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return { user: null }
    }

    // Get user profile via Edge Function
    const { data, error } = await supabase.functions.invoke('users/get-profile', {
      method: 'GET'
    })
    
    if (error) {
      logger.error({
        msg: 'Failed to get user profile',
        error: error.message,
        userId: user.id
      })
      return { user }
    }

    return { user: { ...user, profile: data } }
  } catch (error) {
    logger.error({
      msg: 'Error in getUser',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error)
    })
    
    return { user: null }
  }
}

/**
 * Middleware to protect server actions
 */
export async function withAuth<T extends ServerAction<unknown[], unknown>>(action: T): Promise<T> {
  return (async (...args: Parameters<T>) => {
    const { user } = await getUser()
    
    if (!user) {
      redirect('/auth/signin')
    }

    return action(...args)
  }) as T
}

// MARK: - Session Management

/**
 * Gets the current session state
 */
export async function getSession() {
  try {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return { session: null }
    }
    
    // Get user profile via Edge Function
    const { data, error } = await supabase.functions.invoke('users/get-profile', {
      method: 'GET'
    })
    
    if (error) {
      logger.error({
        msg: 'Failed to get user profile for session',
        error: error.message,
        userId: session.user.id
      })
      return { session }
    }
    
    // Add profile to session user
    const enhancedSession = {
      ...session,
      user: {
        ...session.user,
        profile: data
      }
    }
    
    return { session: enhancedSession }
  } catch (error) {
    logger.error({
      msg: 'Error in getSession',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : String(error)
    })
    
    return { session: null }
  }
}

/**
 * Refreshes the current session
 */
export async function refreshSession() {
  try {
    const supabase = await createClient()
    const { data: { session }, error } = await supabase.auth.refreshSession()

    if (error) throw error

    return { session, error: null }
  } catch (error) {
    console.error('Refresh session error:', error)
    return {
      session: null,
      error: formatError(error)
    }
  }
}

/**
 * Gets the current user's ID from the session
 * @returns The user ID or null if not authenticated
 */
export async function getUserId(): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return null;
    }
    
    return session.user.id;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
} 