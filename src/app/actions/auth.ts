'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { AuthError as SupabaseAuthError } from '@supabase/supabase-js'
import type { Database } from '@/lib/shared/types/supabase'
import { UsersRepository, InvitationsRepository } from '@/lib/server/repositories'
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@/lib/server/supabase'

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

type UserInsert = Database['public']['Tables']['users']['Insert']
type ServerAction<Args extends unknown[], Return> = (...args: Args) => Promise<Return>

/**
 * Creates a new Supabase client for each request
 */
async function getSupabase() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // This can be ignored if you have middleware refreshing user sessions
          }
        },
      },
    }
  )
}

// Separate function for service role client
async function getServiceRoleSupabase() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // This can be ignored if you have middleware refreshing user sessions
          }
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Formats error messages from Supabase
 */
function formatError(error: unknown): AuthError {
  console.error('Formatting error:', error)
  
  // Handle PostgrestError (database errors)
  if (error && typeof error === 'object' && 'code' in error && 'message' in error && 'details' in error) {
    const pgError = error as { code: string; message: string; details: string }
    return {
      message: `Database error: ${pgError.message}`,
      code: pgError.code,
      details: pgError.details
    }
  }
  
  // Handle standard Error objects
  if (error instanceof Error) {
    return {
      message: error.message,
      code: (error as SupabaseAuthError).code
    }
  }
  
  // Handle unknown error format
  return {
    message: 'An unexpected error occurred',
    details: JSON.stringify(error)
  }
}

// MARK: - Auth Actions

/**
 * Signs up a new user and creates their profile
 */
export async function signUp(data: SignUpData) {
  try {
    console.log('Starting user signup process for:', data.email);
    // Create a service role client for admin operations
    const supabase = await getServiceRoleSupabase();

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
    });

    if (authError) {
      console.error('Auth signup error:', authError);
      throw authError;
    }
    if (!authData.user) throw new Error('No user returned from auth signup');

    console.log('Auth user created successfully:', authData.user.id);
    
    // IMPORTANT: Wait a moment to ensure auth user is fully registered in the database
    // This helps avoid race conditions with triggers
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if user profile already exists (from trigger)
    const { data: existingProfile } = await supabase
      .from('users')
      .select('id')
      .eq('id', authData.user.id)
      .single();
      
    if (existingProfile) {
      console.log('User profile already exists from trigger, updating it');
      
      // Begin transaction to ensure all operations succeed or fail together
      const { error: beginTxnError } = await supabase.rpc('begin_transaction');
      if (beginTxnError) {
        console.error('Transaction start error:', beginTxnError);
        throw beginTxnError;
      }
      
      try {
        // Update the existing profile with complete information
        const { error: updateError } = await supabase
          .from('users')
          .update({
            first_name: data.firstName,
            last_name: data.lastName,
            display_name: `${data.firstName} ${data.lastName}`,
            date_of_birth: data.dateOfBirth,
            gender: data.gender as 'male' | 'female' | 'other',
            is_pending_signup: false,
            updated_at: new Date().toISOString(),
            is_admin: true,
            can_add_members: true,
            can_edit: true
          })
          .eq('id', authData.user.id);
          
        if (updateError) {
          console.error('Error updating existing profile:', updateError);
          throw updateError;
        }
        
        // Create default family tree
        const { data: treeData, error: treeError } = await supabase
          .from('family_trees')
          .insert({
            name: `${data.firstName}'s Family Tree`,
            owner_id: authData.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (treeError) {
          console.error('Family tree creation error:', treeError);
          throw treeError;
        }
        
        console.log('Family tree created successfully:', treeData.id);
        
        // Update user with family tree ID
        const { error: updateTreeError } = await supabase
          .from('users')
          .update({ family_tree_id: treeData.id })
          .eq('id', authData.user.id);
        
        if (updateTreeError) {
          console.error('Error updating user with family tree ID:', updateTreeError);
          throw updateTreeError;
        }
        
        // Grant owner admin access in family_tree_access table
        const { error: accessError } = await supabase
          .from('family_tree_access')
          .insert({
            tree_id: treeData.id,
            user_id: authData.user.id,
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (accessError) {
          console.error('Error creating family tree access record:', accessError);
          throw accessError;
        }
        
        // Add user as a member of their own family tree
        const { error: nodeError } = await supabase
          .from('family_tree_nodes')
          .insert({
            family_tree_id: treeData.id,
            user_id: authData.user.id,
            gender: data.gender,
            attributes: {
              first_name: data.firstName,
              last_name: data.lastName,
              display_name: `${data.firstName} ${data.lastName}`,
              date_of_birth: data.dateOfBirth,
              familyTreeId: treeData.id,
              isBloodRelated: true,
              treeOwnerId: authData.user.id
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (nodeError) {
          console.error('Error creating family tree node:', nodeError);
          throw nodeError;
        }
        
        console.log('User added as family tree member successfully');
        
        // Create history book for the user
        const { data: historyBookData, error: historyBookError } = await supabase
          .from('history_books')
          .insert({
            title: `${data.firstName}'s History Book`,
            description: `A collection of stories and memories for ${data.firstName} ${data.lastName}`,
            family_tree_id: treeData.id,
            owner_id: authData.user.id,
            privacy_level: 'personal',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (historyBookError) {
          console.error('History book creation error:', historyBookError);
          throw historyBookError;
        }
        
        console.log('History book created successfully:', historyBookData.id);
        
        // Update user with history book ID
        const { error: updateHistoryBookError } = await supabase
          .from('users')
          .update({ history_book_id: historyBookData.id })
          .eq('id', authData.user.id);
        
        if (updateHistoryBookError) {
          console.error('Error updating user with history book ID:', updateHistoryBookError);
          throw updateHistoryBookError;
        }
        
        // Commit the transaction
        const { error: commitError } = await supabase.rpc('commit_transaction');
        if (commitError) {
          console.error('Transaction commit error:', commitError);
          throw commitError;
        }
        
        console.log('Existing user setup completed successfully');
      } catch (error) {
        // Rollback transaction on any error
        console.error('Error during existing user setup:', error);
        const { error: rollbackError } = await supabase.rpc('rollback_transaction');
        if (rollbackError) {
          console.error('Transaction rollback error:', rollbackError);
        }
        throw error;
      }
    } else {
      // Begin transaction to ensure all database operations are atomic
      const { error: transactionError } = await supabase.rpc('begin_transaction');
      if (transactionError) {
        console.error('Transaction start error:', transactionError);
        throw transactionError;
      }
      
      try {
        // 1. Create user profile
        const userProfile: UserInsert = {
          id: authData.user.id,
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          display_name: `${data.firstName} ${data.lastName}`,
          date_of_birth: data.dateOfBirth,
          gender: data.gender as 'male' | 'female' | 'other',
          is_pending_signup: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_admin: true,
          can_add_members: true,
          can_edit: true,
          email_verified: false,
          data_retention_period: 'forever'
        };

        console.log('Creating user profile in database transaction');

        // Insert user profile using service role client
        const { error: profileError } = await supabase
          .from('users')
          .insert(userProfile);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw profileError;
        }
        
        // 2. Manually create notification preferences to avoid trigger race condition
        const { error: preferencesError } = await supabase
          .from('notification_preferences')
          .insert({
            user_id: authData.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
        
        if (preferencesError) {
          console.error('Notification preferences creation error:', preferencesError);
          throw preferencesError;
        }

        // 3. Create default family tree
        const { data: treeData, error: treeError } = await supabase
          .from('family_trees')
          .insert({
            name: `${data.firstName}'s Family Tree`,
            owner_id: authData.user.id,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (treeError) {
          console.error('Family tree creation error:', treeError);
          throw treeError;
        }
        
        console.log('Family tree created successfully:', treeData.id);
        
        // 4. Update user with family tree ID
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            family_tree_id: treeData.id,
            is_pending_signup: false
          })
          .eq('id', authData.user.id);
        
        if (updateError) {
          console.error('Error updating user with family tree ID:', updateError);
          throw updateError;
        }
        
        // 5. Grant owner admin access in family_tree_access table
        const { error: accessError } = await supabase
          .from('family_tree_access')
          .insert({
            tree_id: treeData.id,
            user_id: authData.user.id,
            role: 'admin',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (accessError) {
          console.error('Error creating family tree access record:', accessError);
          throw accessError;
        }
        
        // 6. Add user as a member of their own family tree
        const { error: nodeError } = await supabase
          .from('family_tree_nodes')
          .insert({
            family_tree_id: treeData.id,
            user_id: authData.user.id,
            gender: data.gender,
            attributes: {
              first_name: data.firstName,
              last_name: data.lastName,
              display_name: `${data.firstName} ${data.lastName}`,
              date_of_birth: data.dateOfBirth,
              familyTreeId: treeData.id,
              isBloodRelated: true,
              treeOwnerId: authData.user.id
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });
          
        if (nodeError) {
          console.error('Error creating family tree node:', nodeError);
          throw nodeError;
        }
        
        console.log('User added as family tree member successfully');
        
        // 7. Create history book for the user
        const { data: historyBookData, error: historyBookError } = await supabase
          .from('history_books')
          .insert({
            title: `${data.firstName}'s History Book`,
            description: `A collection of stories and memories for ${data.firstName} ${data.lastName}`,
            family_tree_id: treeData.id,
            owner_id: authData.user.id,
            privacy_level: 'personal',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (historyBookError) {
          console.error('History book creation error:', historyBookError);
          throw historyBookError;
        }
        
        console.log('History book created successfully:', historyBookData.id);
        
        // 8. Update user with history book ID
        const { error: updateHistoryBookError } = await supabase
          .from('users')
          .update({ history_book_id: historyBookData.id })
          .eq('id', authData.user.id);
        
        if (updateHistoryBookError) {
          console.error('Error updating user with history book ID:', updateHistoryBookError);
          throw updateHistoryBookError;
        }
        
        // Commit the transaction
        const { error: commitError } = await supabase.rpc('commit_transaction');
        if (commitError) {
          console.error('Transaction commit error:', commitError);
          throw commitError;
        }
        
        console.log('Signup transaction completed successfully');
      } catch (dbError) {
        // Rollback transaction on any error
        console.error('Database error during signup:', dbError);
        const { error: rollbackError } = await supabase.rpc('rollback_transaction');
        if (rollbackError) {
          console.error('Transaction rollback error:', rollbackError);
        }
        throw dbError;
      }
    }

    // Return success with user data
    return { 
      success: true,
      user: authData.user,
      session: authData.session,
      needsEmailVerification: !authData.session
    };
  } catch (error) {
    console.error('Sign up error:', error);
    console.error('Error type:', typeof error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    if (error && typeof error === 'object') {
      console.error('Error properties:', Object.keys(error));
    }
    
    return {
      success: false,
      error: formatError(error)
    };
  }
}

/**
 * Signs in a user with email and password
 */
export async function signIn(data: SignInData) {
  try {
    console.log('SignIn attempt with:', { email: data.email }); // Debug log
    const supabase = await createClient()
    
    // First try to refresh the session in case there's a valid token
    await supabase.auth.refreshSession()
    
    // Sign in with email and password
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

    // After successful sign-in, explicitly get the session again
    // This ensures cookies are properly set
    const { data: { session: verifiedSession }, error: sessionError } = 
      await supabase.auth.getSession()
    
    if (sessionError) {
      console.warn('Warning: Could not verify session after login:', sessionError)
      // Continue anyway with the initial session
    } else if (!verifiedSession) {
      console.warn('Warning: No verified session found after login')
      // Continue anyway with the initial session
    } else {
      console.log('Session verified after sign-in')
    }

    console.log('SignIn successful:', { 
      userId: authData.user.id,
      sessionExpires: authData.session.expires_at,
      hasAccessToken: !!authData.session.access_token,
      hasRefreshToken: !!authData.session.refresh_token
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
    const cookieStore = await cookies()
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch {
              // This can be ignored if you have middleware refreshing user sessions
            }
          },
        },
      }
    )

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
      gender: data.gender as 'male' | 'female' | 'other',
      is_pending_signup: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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