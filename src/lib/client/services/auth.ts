/**
 * Client-side auth service
 * 
 * This provides a clean wrapper around API client for authentication.
 * It's designed to be used by components that need authentication functionality.
 */

import { api } from '@/lib/api-client'
import logger from '@/lib/logger'

// MARK: - Types
export type AuthError = {
  message: string
  code?: string
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

export type PrefillData = {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: string;
  phoneNumber?: string;
  relationship?: string;
}

export type VerifyInvitationResult = {
  success: boolean;
  prefillData?: PrefillData;
  inviteeEmail?: string;
  error?: AuthError;
}

// Define the expected response type for verify invitation
type VerifyInvitationResponse = {
  prefillData?: PrefillData;
  inviteeEmail?: string;
}

// Define response types for auth endpoints
type AuthUserResponse = {
  user: any;
}

type AuthSessionResponse = {
  user: any;
  session: any;
}

// MARK: - Service Functions

/**
 * Sign up a new user
 */
export async function signUpUser(data: SignUpData) {
  try {
    logger.debug({
      msg: 'Starting sign up process',
      email: data.email.substring(0, 3) + '***' + data.email.split('@')[1]
    })
    
    const response = await api.auth.signUp({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      dateOfBirth: data.dateOfBirth,
      gender: data.gender
    })
    
    if (response.error) {
      logger.error({
        msg: 'Sign up failed',
        error: response.error.message,
        code: response.error.code
      })
      
      return { 
        error: { 
          message: response.error.message,
          code: response.error.code
        } 
      }
    }
    
    logger.debug({
      msg: 'Sign up API call succeeded',
      hasUser: !!response.data?.user
    })
    
    // Cast to the expected type
    const userData = response.data as AuthUserResponse
    
    return { user: userData?.user }
  } catch (error) {
    logger.error({
      msg: 'Unexpected sign up error',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      error: {
        message: error instanceof Error ? error.message : 'An unexpected error occurred during sign up'
      }
    }
  }
}

/**
 * Sign in a user with email and password
 */
export async function signInUser(data: SignInData) {
  try {
    logger.debug({
      msg: 'Starting sign in process',
      email: data.email.substring(0, 3) + '***' + data.email.split('@')[1]
    })
    
    const response = await api.auth.signIn({
      email: data.email,
      password: data.password
    })
    
    if (response.error) {
      logger.error({
        msg: 'Sign in failed',
        error: response.error.message,
        code: response.error.code
      })
      
      return { 
        error: { 
          message: response.error.message,
          code: response.error.code
        } 
      }
    }
    
    // Log success with session details
    logger.debug({
      msg: 'Sign in API call succeeded',
      hasSession: !!response.data?.session,
      hasUser: !!response.data?.user
    })
    
    // Cast to the expected type and return the session
    const sessionData = response.data as AuthSessionResponse
    
    return { session: sessionData.session }
  } catch (error) {
    logger.error({
      msg: 'Unexpected sign in error',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      error: {
        message: error instanceof Error ? error.message : 'An unexpected error occurred during sign in'
      }
    }
  }
}

/**
 * Sign out the current user
 */
export async function signOutUser() {
  try {
    logger.debug({
      msg: 'Starting sign out process'
    })
    
    const response = await api.auth.signOut()
    
    if (response.error) {
      logger.error({
        msg: 'Sign out failed',
        error: response.error.message,
        code: response.error.code
      })
      
      return { 
        error: { 
          message: response.error.message,
          code: response.error.code
        } 
      }
    }
    
    logger.debug({
      msg: 'Sign out successful'
    })
    
    return { success: true }
  } catch (error) {
    logger.error({
      msg: 'Unexpected sign out error',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      error: {
        message: error instanceof Error ? error.message : 'An unexpected error occurred during sign out'
      }
    }
  }
}

/**
 * Send password reset email
 */
export async function resetUserPassword(email: string) {
  try {
    logger.debug({
      msg: 'Starting password reset process',
      email: email.substring(0, 3) + '***' + email.split('@')[1]
    })
    
    const response = await api.auth.resetPassword(email)
    
    if (response.error) {
      logger.error({
        msg: 'Password reset failed',
        error: response.error.message,
        code: response.error.code
      })
      
      return { 
        error: { 
          message: response.error.message,
          code: response.error.code
        } 
      }
    }
    
    logger.debug({
      msg: 'Password reset email sent successfully'
    })
    
    return { success: true }
  } catch (error) {
    logger.error({
      msg: 'Unexpected password reset error',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      error: {
        message: error instanceof Error ? error.message : 'An unexpected error occurred during password reset'
      }
    }
  }
}

/**
 * Get the current user session
 */
export async function getUserSession() {
  try {
    const response = await api.auth.getUser()
    
    if (response.error) {
      logger.error({
        msg: 'Get user failed',
        error: response.error.message
      })
      return { error: { message: response.error.message } }
    }
    
    // Cast to the expected type
    const userData = response.data as AuthSessionResponse
    
    return { 
      user: userData.user,
      session: userData.session 
    }
  } catch (error) {
    logger.error({
      msg: 'Unexpected error getting user session',
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      error: {
        message: error instanceof Error ? error.message : 'An unexpected error occurred getting user session'
      }
    }
  }
}

/**
 * Verify an invitation
 */
export async function verifyUserInvitation(token: string, invitationId: string): Promise<VerifyInvitationResult> {
  const response = await api.auth.verifyInvitation(token, invitationId)
  
  if (response.error) {
    logger.error({
      msg: 'Verify invitation failed',
      error: response.error
    })
    return { 
      success: false,
      error: response.error
    }
  }
  
  // Cast the data to the expected type
  const verificationData = response.data as VerifyInvitationResponse
  
  return { 
    success: true,
    prefillData: verificationData?.prefillData,
    inviteeEmail: verificationData?.inviteeEmail
  }
}

/**
 * Sign up a user with an invitation
 */
export async function signUpUserWithInvitation(data: InvitedSignUpData) {
  const response = await api.auth.signUpWithInvitation(data)
  
  if (response.error) {
    logger.error({
      msg: 'Sign up with invitation failed',
      error: response.error
    })
    return { error: response.error }
  }
  
  return { user: response.data }
}

/**
 * Send email verification
 */
export async function sendEmailVerification(data: { email: string, expiresIn?: number }) {
  try {
    const response = await api.auth.verifyEmail(data.email)
    
    if (response.error) {
      logger.error({
        msg: 'Email verification resend failed',
        error: response.error.message
      })
      return { error: { message: response.error.message }, success: false }
    }
    
    return { success: true }
  } catch (error) {
    logger.error({
      msg: 'Email verification resend failed',
      error: error instanceof Error ? error.message : String(error)
    })
    return { 
      error: { 
        message: error instanceof Error ? error.message : 'Failed to resend verification email' 
      }, 
      success: false 
    }
  }
}

// MARK: - Unified Service Export
export const authService = {
  signUp: signUpUser,
  signIn: signInUser,
  signOut: signOutUser,
  resetPassword: resetUserPassword,
  getSession: getUserSession,
  verifyInvitation: verifyUserInvitation,
  signUpWithInvitation: signUpUserWithInvitation,
  sendEmailVerification: sendEmailVerification,
} 