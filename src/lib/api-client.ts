/**
 * API Client for Supabase Edge Functions
 * 
 * This file provides a unified interface for making requests to Edge Functions.
 * It handles authentication, error handling, and response parsing.
 */

import { createClient } from '@/lib/supabase'
import logger from '@/lib/logger'

// Base URL for Edge Functions
const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
  : ''

// MARK: - Types

export type ApiResponse<T> = {
  data?: T
  error?: {
    message: string
    code?: string
    details?: string
  }
}

// MARK: - Helper Functions

/**
 * Get auth header with the current session token
 */
async function getAuthHeader(): Promise<HeadersInit> {
  const supabase = createClient()
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token

  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  }
}

/**
 * Make a request to an Edge Function
 */
export async function callEdgeFunction<T>(
  functionName: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>
): Promise<ApiResponse<T>> {
  try {
    // Build URL with query parameters
    let url = `${FUNCTIONS_URL}/${functionName}`
    if (queryParams) {
      const params = new URLSearchParams()
      Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, value)
      })
      url += `?${params.toString()}`
    }

    // Get auth headers
    const headers = await getAuthHeader()

    // Make the request
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    })

    // Parse the response
    const data = await response.json()

    // Check for errors
    if (!response.ok) {
      logger.error({
        msg: `Edge Function error: ${functionName}`,
        status: response.status,
        error: data.error || data
      })
      
      return {
        error: {
          message: data.error?.message || 'An error occurred',
          code: data.error?.code,
          details: data.error?.details
        }
      }
    }

    return { data }
  } catch (error) {
    logger.error({
      msg: `Edge Function request failed: ${functionName}`,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      error: {
        message: error instanceof Error ? error.message : 'Network error',
      }
    }
  }
}

// MARK: - API Client

/**
 * Auth API for interacting with auth Edge Functions
 */
export const auth = {
  /**
   * Sign up a new user
   */
  signUp: async (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: string
  }) => {
    return callEdgeFunction('auth', 'POST', {
      action: 'signup',
      ...data
    })
  },

  /**
   * Sign in a user
   */
  signIn: async (data: { email: string; password: string }) => {
    return callEdgeFunction('auth', 'POST', {
      action: 'signin',
      ...data
    })
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    return callEdgeFunction('auth', 'POST', {
      action: 'signout'
    })
  },

  /**
   * Reset password
   */
  resetPassword: async (email: string) => {
    return callEdgeFunction('auth', 'POST', {
      action: 'reset-password',
      email
    })
  },

  /**
   * Verify email
   */
  verifyEmail: async (token: string) => {
    return callEdgeFunction('auth', 'POST', {
      action: 'verify-email',
      token
    })
  },

  /**
   * Verify invitation
   */
  verifyInvitation: async (token: string, invitationId: string) => {
    return callEdgeFunction('auth', 'POST', {
      action: 'verify-invitation',
      token,
      invitationId
    })
  },

  /**
   * Sign up with invitation
   */
  signUpWithInvitation: async (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: string
    invitationId: string
    token: string
  }) => {
    return callEdgeFunction('auth', 'POST', {
      action: 'signup-with-invitation',
      ...data
    })
  },

  /**
   * Get current user
   */
  getUser: async () => {
    return callEdgeFunction('auth', 'GET', undefined, { action: 'get-user' })
  }
}

// MARK: - Storage API

/**
 * Storage API for interacting with storage Edge Functions
 */
export const storage = {
  /**
   * Process media file
   */
  processMedia: async (url: string, options: {
    type: 'image' | 'video' | 'audio'
    params: Record<string, unknown>
  }) => {
    return callEdgeFunction('process-media', 'POST', {
      url,
      options
    })
  }
}

/**
 * Export other API modules for different Edge Functions
 */
export const api = {
  auth,
  storage,
  // Add other modules as needed for your other Edge Functions
} 