import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/shared/types/supabase'

/**
 * Creates a Supabase admin client with service role key
 * This bypasses RLS and should only be used in server-side code
 */
export function createServiceClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use createServiceClient() instead
 */
export function createServerSupabaseClient() {
  return createServiceClient()
}

// Helper to get authenticated user from server component
export async function getAuthenticatedUser() {
  try {
    const supabase = createServiceClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch {
    return null
  }
}

// Helper to check if user has required role
export async function hasRole(role: string) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return false
    
    const supabase = createServiceClient()
    const { data: userRoles, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single()
      
    if (error || !userRoles) return false
    return userRoles.role === role
  } catch {
    return false
  }
}

/**
 * Helper to verify user has permission for an action
 */
export async function hasPermission(permission: string) {
  try {
    const user = await getAuthenticatedUser()
    if (!user) return false
    
    const supabase = createServiceClient()
    const { data: userPermissions, error } = await supabase
      .from('user_permissions')
      .select('permissions')
      .eq('user_id', user.id)
      .single()
      
    if (error || !userPermissions) return false
    return userPermissions.permissions.includes(permission)
  } catch {
    return false
  }
} 