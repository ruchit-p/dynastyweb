/**
 * Client-side auth service
 * 
 * This provides a clean wrapper around server actions for authentication.
 * It's designed to be used by components that need authentication functionality.
 */

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
  type SignInData,
} from '@/app/actions/auth'

// MARK: - Types
export type AuthError = {
  message: string
  code?: string
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

// Re-export types from actions for convenience
export { type SignUpData, type InvitedSignUpData, type SignInData }

// MARK: - Service Functions

/**
 * Sign up a new user
 */
export async function signUpUser(data: SignUpData) {
  return await signUp(data)
}

/**
 * Sign in a user with email and password
 */
export async function signInUser(data: SignInData) {
  return await signIn(data)
}

/**
 * Sign out the current user
 */
export async function signOutUser() {
  return await signOut()
}

/**
 * Send password reset email
 */
export async function resetUserPassword(email: string) {
  return await resetPassword(email)
}

/**
 * Get the current user session
 */
export async function getUserSession() {
  return await getSession()
}

/**
 * Refresh the user session
 */
export async function refreshUserSession() {
  return await refreshSession()
}

/**
 * Verify an invitation
 */
export async function verifyUserInvitation(token: string, invitationId: string): Promise<VerifyInvitationResult> {
  return await verifyInvitation(token, invitationId)
}

/**
 * Sign up a user with an invitation
 */
export async function signUpUserWithInvitation(data: InvitedSignUpData) {
  return await signUpWithInvitation(data)
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