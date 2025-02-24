'use server'

import { createServerSupabaseClient } from '@/lib/server/supabase-admin'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { validateFormData, signupFormSchema, loginFormSchema } from '@/lib/validation'
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js'
import type { Database } from '@/lib/shared/types/supabase'
import { UsersRepository, InvitationsRepository } from '@/lib/server/repositories'

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
  invitationId: string;
  token: string;
}

type UserInsert = Database['public']['Tables']['users']['Insert']
type ServerAction<Args extends unknown[], Return> = (...args: Args) => Promise<Return>

/**
 * Creates a new Supabase client for each request
 */
function getSupabase() {
  const cookieStore = cookies()
  return createServerSupabaseClient()
}

/**
 * Formats error messages from Supabase
 */
function formatError(error: unknown): AuthError {
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as SupabaseAuthError).code
    }
  }
  return {
    message: 'An unexpected error occurred'
  }
}

// MARK: - Auth Actions

/**
 * Signs up a new user and creates their profile
 */
export async function signUp(data: SignUpData) {
  try {
    const supabase = getSupabase()

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      }
    })

    if (authError) throw authError

    // Create user profile
    const usersRepo = new UsersRepository(supabase)
    const userProfile: UserInsert = {
      id: authData.user!.id,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      display_name: `${data.firstName} ${data.lastName}`,
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      is_pending_signup: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      parent_ids: [],
      children_ids: [],
      spouse_ids: [],
      is_admin: false,
      can_add_members: true,
      can_edit: true,
      email_verified: false,
      data_retention_period: 'forever'
    }
    await usersRepo.create(userProfile)

    return { success: true }
  } catch (error) {
    console.error('Sign up error:', error)
    return {
      success: false,
      error: formatError(error)
    }
  }
}

/**
 * Signs in a user with email and password
 */
export async function signIn(data: SignInData) {
  try {
    const supabase = getSupabase()
    
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Sign in error:', error)
    return {
      success: false,
      error: formatError(error)
    }
  }
}

/**
 * Signs out the current user
 */
export async function signOut() {
  try {
    const supabase = getSupabase()
    const { error } = await supabase.auth.signOut()

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Sign out error:', error)
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
    const supabase = getSupabase()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Reset password error:', error)
    return {
      success: false,
      error: formatError(error)
    }
  }
}

/**
 * Updates a user's password
 */
export async function updatePassword(newPassword: string) {
  try {
    const supabase = getSupabase()
    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Update password error:', error)
    return {
      success: false,
      error: formatError(error)
    }
  }
}

/**
 * Verifies a user's email
 */
export async function verifyEmail(token: string) {
  try {
    const supabase = getSupabase()
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    })

    if (error) throw error

    // Update user profile
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const usersRepo = new UsersRepository(supabase)
      await usersRepo.update(user.id, {
        email_verified: true,
        is_pending_signup: false,
        updated_at: new Date().toISOString()
      })
    }

    return { success: true }
  } catch (error) {
    console.error('Verify email error:', error)
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
    const supabase = getSupabase()
    const invitationsRepo = new InvitationsRepository(supabase)
    
    const invitation = await invitationsRepo.getByToken(token, invitationId)
    if (!invitation) {
      throw new Error('Invalid invitation')
    }

    if (invitation.status !== 'pending') {
      throw new Error('Invitation has already been used')
    }

    return {
      success: true,
      prefillData: {
        firstName: invitation.invitee_name.split(' ')[0] || '',
        lastName: invitation.invitee_name.split(' ')[1] || '',
        dateOfBirth: undefined,
        gender: undefined,
        phoneNumber: undefined,
        relationship: invitation.relationship || undefined,
      },
      inviteeEmail: invitation.invitee_email
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
    const supabase = getSupabase()

    // Verify invitation first
    const invitation = await verifyInvitation(data.token, data.invitationId)
    if (!invitation.success) {
      throw invitation.error
    }

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`
      }
    })

    if (authError) throw authError

    // Create user profile
    const usersRepo = new UsersRepository(supabase)
    const userProfile: UserInsert = {
      id: authData.user!.id,
      email: data.email,
      first_name: data.firstName,
      last_name: data.lastName,
      display_name: `${data.firstName} ${data.lastName}`,
      date_of_birth: data.dateOfBirth,
      gender: data.gender,
      is_pending_signup: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      parent_ids: [],
      children_ids: [],
      spouse_ids: [],
      is_admin: false,
      can_add_members: true,
      can_edit: true,
      email_verified: false,
      data_retention_period: 'forever'
    }
    await usersRepo.create(userProfile)

    // Update invitation status
    const invitationsRepo = new InvitationsRepository(supabase)
    await invitationsRepo.update(data.invitationId, {
      status: 'accepted',
      invitee_id: authData.user!.id
    })

    return { success: true }
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
    const supabase = getSupabase()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error) throw error

    if (!user) {
      return { user: null }
    }

    // Get user profile
    const usersRepo = new UsersRepository(supabase)
    const profile = await usersRepo.getById(user.id)

    return { user: { ...user, profile } }
  } catch (error) {
    console.error('Get user error:', error)
    return {
      user: null,
      error: formatError(error)
    }
  }
}

/**
 * Middleware to protect server actions
 */
export function withAuth<T extends ServerAction<unknown[], unknown>>(action: T): T {
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
    const supabase = getSupabase()
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) throw error

    if (!session) {
      return { session: null }
    }

    // Get user profile
    const usersRepo = new UsersRepository(supabase)
    const profile = await usersRepo.getById(session.user.id)

    return { 
      session,
      profile,
      error: null
    }
  } catch (error) {
    console.error('Get session error:', error)
    return {
      session: null,
      profile: null,
      error: formatError(error)
    }
  }
}

/**
 * Refreshes the current session
 */
export async function refreshSession() {
  try {
    const supabase = getSupabase()
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