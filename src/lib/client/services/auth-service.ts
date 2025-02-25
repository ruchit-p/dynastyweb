import type { AuthError as SupabaseAuthError, PostgrestError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase'

// MARK: - Types
export type AuthError = {
  message: string;
  code?: string;
  status: number;
}

export type SignUpData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
}

export type SignInData = {
  email: string;
  password: string;
}

export type InvitedSignUpData = SignUpData & {
  inviteCode: string;
}

export type EmailVerificationData = {
  email: string;
  expiresIn?: number;
}

export type ResetPasswordData = {
  email: string;
}

export type UpdatePasswordData = {
  password: string;
}

// MARK: - Helper Functions

/**
 * Handle Supabase auth errors with detailed error messages
 */
function handleAuthError(error: SupabaseAuthError): { success: false; error: AuthError } {
  // Map error codes to more user-friendly messages
  const errorMap: Record<string, string> = {
    'invalid_credentials': 'The email or password you entered is incorrect. Please try again.',
    'user_not_found': 'No account was found with this email address.',
    'email_not_confirmed': 'Please verify your email address before logging in.',
    'email_taken': 'An account with this email already exists.',
    'weak_password': 'Password is too weak. Please use at least 8 characters including a number and a symbol.',
    'expired_token': 'Your session has expired. Please log in again.',
    'invalid_token': 'Invalid authentication token. Please log in again.',
    'rate_limit_exceeded': 'Too many attempts. Please try again later.',
    'server_error': 'Server error. Please try again later.',
  };
  
  const message = errorMap[error.message] || errorMap[error.code || ''] || error.message || 'An authentication error occurred';
  
  return {
    success: false,
    error: {
      message,
      code: error.code,
      status: error.status || 400
    }
  };
}

/**
 * Handle general errors
 */
function handleError(error: unknown): { success: false; error: AuthError } {
  console.error('Auth service error:', error);
  
  // Type guard for PostgrestError
  if (typeof error === 'object' && error !== null && 'code' in error && 'message' in error) {
    const pgError = error as PostgrestError;
    return {
      success: false,
      error: {
        message: pgError.message || 'A database error occurred',
        code: pgError.code,
        status: pgError.code ? 400 : 500
      }
    };
  }
  
  // Generic error
  return {
    success: false,
    error: {
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      status: 500
    }
  };
}

// MARK: - Authentication Functions

/**
 * Sign up a new user
 */
export async function signUp(data: SignUpData) {
  try {
    // Create a Supabase client
    const supabase = createClient();
    
    const { data: authData, error } = await supabase.auth.signUp({
      email: data.email.trim(),
      password: data.password,
      options: {
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          date_of_birth: data.dateOfBirth,
          gender: data.gender
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      }
    });
    
    if (error) {
      return handleAuthError(error);
    }
    
    return {
      success: true,
      user: authData.user
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Sign in a user with email and password
 */
export async function signIn(data: SignInData) {
  try {
    // Create a Supabase client
    const supabase = createClient();
    
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email.trim(),
      password: data.password
    });
    
    if (error) {
      return handleAuthError(error);
    }
    
    return {
      success: true,
      user: authData.user,
      session: authData.session
    };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  try {
    // Create a Supabase client
    const supabase = createClient();
    
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return handleAuthError(error);
    }
    
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Send email verification
 */
export async function sendEmailVerification(data: EmailVerificationData) {
  try {
    // Create a Supabase client
    const supabase = createClient();
    
    // Use the resend method which is available in the Supabase API
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: data.email.trim(),
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
      }
    });
    
    if (error) {
      return handleAuthError(error);
    }
    
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Send a password reset email
 */
export async function resetPassword(data: ResetPasswordData) {
  try {
    // Create a Supabase client
    const supabase = createClient();
    
    const { error } = await supabase.auth.resetPasswordForEmail(data.email.trim(), {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`
    });
    
    if (error) {
      return handleAuthError(error);
    }
    
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Update the user's password
 */
export async function updatePassword(data: UpdatePasswordData) {
  try {
    // Create a Supabase client
    const supabase = createClient();
    
    const { error } = await supabase.auth.updateUser({
      password: data.password
    });
    
    if (error) {
      return handleAuthError(error);
    }
    
    return { success: true };
  } catch (error) {
    return handleError(error);
  }
}

/**
 * Get the current user
 */
export async function getUser() {
  try {
    // Create a Supabase client
    const supabase = createClient();
    
    const { data, error } = await supabase.auth.getUser();
    
    if (error) {
      return handleAuthError(error);
    }
    
    return {
      success: true,
      user: data.user
    };
  } catch (error) {
    return handleError(error);
  }
}

// Export named functions
export const authService = {
  signUp,
  signIn,
  signOut,
  sendEmailVerification,
  resetPassword,
  updatePassword,
  getUser
}; 