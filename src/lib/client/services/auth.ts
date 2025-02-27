/**
 * Client-side auth service
 * 
 * This provides a clean wrapper around Edge Functions for authentication.
 * It's designed to be used by components that need authentication functionality.
 */

import { createClient } from '@/lib/supabase'
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

// MARK: - Service Functions

/**
 * Sign up a new user
 */
export async function signUpUser(data: SignUpData) {
  const response = await api.auth.signUp(data)
  
  if (response.error) {
    logger.error({
      msg: 'Sign up failed',
      error: response.error
    })
    return { error: response.error }
  }
  
  return { user: response.data }
}

/**
 * Sign in a user with email and password
 */
export async function signInUser(data: SignInData) {
  const response = await api.auth.signIn(data)
  
  if (response.error) {
    logger.error({
      msg: 'Sign in failed',
      error: response.error
    })
    return { error: response.error }
  }
  
  return { session: response.data }
}

/**
 * Sign out the current user
 */
export async function signOutUser() {
  const response = await api.auth.signOut()
  
  if (response.error) {
    logger.error({
      msg: 'Sign out failed',
      error: response.error
    })
    return { error: response.error }
  }
  
  return { success: true }
}

/**
 * Send password reset email
 */
export async function resetUserPassword(email: string) {
  const response = await api.auth.resetPassword(email)
  
  if (response.error) {
    logger.error({
      msg: 'Password reset failed',
      error: response.error
    })
    return { error: response.error }
  }
  
  return { success: true }
}

/**
 * Get the current user session
 */
export async function getUserSession() {
  // Use Supabase client directly for getting session since it's handled by the browser
  const supabase = createClient()
  const { data, error } = await supabase.auth.getSession()
  
  if (error) {
    logger.error({
      msg: 'Get session failed',
      error: error.message
    })
    return { error: { message: error.message } }
  }
  
  return { session: data.session }
}

/**
 * Refresh the user session
 */
export async function refreshUserSession() {
  // Use Supabase client directly for refreshing the session
  const supabase = createClient()
  const { data, error } = await supabase.auth.refreshSession()
  
  if (error) {
    logger.error({
      msg: 'Refresh session failed',
      error: error.message
    })
    return { error: { message: error.message } }
  }
  
  return { session: data.session }
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

// MARK: - Unified Service Export
export const authService = {
  signUp: signUpUser,
  signIn: signInUser,
  signOut: signOutUser,
  resetPassword: resetUserPassword,
  getSession: getUserSession,
  refreshSession: refreshUserSession,
  verifyInvitation: verifyUserInvitation,
  signUpWithInvitation: signUpUserWithInvitation,
} 