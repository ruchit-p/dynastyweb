'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServerActionClient } from '@supabase/auth-helpers-nextjs'
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

type UserInsert = Database['public']['Tables']['users']['Insert']
type ServerAction<Args extends unknown[], Return> = (...args: Args) => Promise<Return>

/**
 * Creates a new Supabase client for each request
 */
async function getSupabase() {
  const cookieStore = cookies()
  return createServerActionClient<Database, 'public'>({ 
    cookies: () => cookieStore 
  })
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
    // Create a service role client for admin operations
    const cookieStore = cookies()
    const supabase = createServerActionClient<Database, 'public'>({ 
      cookies: () => cookieStore 
    }, {
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      options: { db: { schema: 'public' } }
    })

    // Create auth user with email confirmation disabled for now
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          display_name: `${data.firstName} ${data.lastName}`,
        }
      }
    })

    if (authError) throw authError
    if (!authData.user) throw new Error('No user returned from auth signup')

    // Create user profile
    const userProfile: UserInsert = {
      id: authData.user.id,
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
      is_admin: true,
      can_add_members: true,
      can_edit: true,
      email_verified: false,
      data_retention_period: 'forever'
    }

    // Insert user profile using service role client
    const { error: profileError } = await supabase
      .from('users')
      .insert(userProfile)

    if (profileError) {
      console.error('Profile creation error:', profileError)
      throw profileError
    }

    // Create default family tree
    const { data: treeData, error: treeError } = await supabase
      .from('family_trees')
      .insert({
        name: `${data.firstName}'s Family Tree`,
        owner_id: authData.user.id,
        privacy_level: 'private',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (treeError) {
      console.error('Family tree creation error:', treeError)
      throw treeError
    }

    // Update user profile with family tree ID
    const { error: updateError } = await supabase
      .from('users')
      .update({ family_tree_id: treeData.id })
      .eq('id', authData.user.id)

    if (updateError) {
      console.error('Error updating user with family tree ID:', updateError)
      throw updateError
    }

    // Add user as admin of their family tree
    const { error: accessError } = await supabase
      .from('family_tree_access')
      .insert({
        tree_id: treeData.id,
        user_id: authData.user.id,
        role: 'admin',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (accessError) {
      console.error('Access creation error:', accessError)
      throw accessError
    }

    // Add user as first member of their family tree
    const { error: memberError } = await supabase
      .from('family_tree_members')
      .insert({
        tree_id: treeData.id,
        user_id: authData.user.id,
        first_name: data.firstName,
        last_name: data.lastName,
        display_name: `${data.firstName} ${data.lastName}`,
        date_of_birth: data.dateOfBirth,
        gender: data.gender,
        is_pending: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (memberError) {
      console.error('Member creation error:', memberError)
      throw memberError
    }

    // Return success with user data
    return { 
      success: true,
      user: authData.user,
      session: authData.session,
      needsEmailVerification: !authData.session
    }
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
    console.log('SignIn attempt with:', { email: data.email }); // Debug log
    const supabase = await getSupabase()
    
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password
    })

    if (error) {
      console.error('SignIn error:', error)
      return {
        success: false,
        error
      }
    }

    if (!authData.session || !authData.user) {
      console.error('No session or user data returned from auth')
      return {
        success: false,
        error: new Error('No session established')
      }
    }

    console.log('SignIn successful:', { 
      userId: authData.user.id,
      sessionExpires: authData.session.expires_at
    })

    return { 
      success: true, 
      session: authData.session,
      user: authData.user 
    }
  } catch (error) {
    console.error('SignIn error:', error)
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
    const supabase = await getSupabase()
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
    const supabase = await getSupabase()
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
    const supabase = await getSupabase()
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
    const cookieStore = cookies()
    const supabase = createServerActionClient<Database, 'public'>({ 
      cookies: () => cookieStore 
    }, {
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      options: { db: { schema: 'public' } }
    })

    // Verify the email
    const { error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'email'
    })

    if (error) throw error

    // Get the user after verification
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      // The trigger will handle updating the user profile
      // Just mark the token as used
      const { error: tokenError } = await supabase
        .from('email_verification_tokens')
        .update({
          used_at: new Date().toISOString()
        })
        .eq('token', token)

      if (tokenError) throw tokenError

      // Get the updated user profile
      const usersRepo = new UsersRepository(supabase)
      const profile = await usersRepo.getById(user.id)

      return { 
        success: true,
        user: {
          ...user,
          profile
        }
      }
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
    const supabase = await getSupabase()
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
    const supabase = await getSupabase()

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
    const supabase = await getSupabase()
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
    const supabase = await getSupabase()
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
    const supabase = await getSupabase()
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