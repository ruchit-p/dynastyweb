import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/shared/types/supabase'

export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = cookieStore.get(name)
          return cookie?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (err) {
            console.error('Failed to set cookie:', err)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({ name, ...options })
          } catch (err) {
            console.error('Failed to remove cookie:', err)
          }
        },
      },
    }
  )
}

// Create a singleton instance
export const supabase = createServerSupabaseClient()

// Helper to get authenticated user from server component
export async function getAuthenticatedUser() {
  const supabase = createServerSupabaseClient()
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user
  } catch {
    return null
  }
}

// Helper to check if user has required role
export async function hasRole(role: string) {
  const user = await getAuthenticatedUser()
  if (!user) return false
  
  const { data: userRoles, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()
    
  if (error || !userRoles) return false
  return userRoles.role === role
}

// Helper to verify user has permission for an action
export async function hasPermission(permission: string) {
  const user = await getAuthenticatedUser()
  if (!user) return false
  
  const { data: userPermissions, error } = await supabase
    .from('user_permissions')
    .select('permissions')
    .eq('user_id', user.id)
    .single()
    
  if (error || !userPermissions) return false
  return userPermissions.permissions.includes(permission)
}

/**
 * Rate limiting helper using Redis
 * @param key - The rate limit key (e.g., 'api:endpoint:userId')
 * @param limit - Maximum number of requests allowed in the window
 * @param window - Time window in milliseconds
 * @returns boolean - Whether the request should be allowed
 */
export async function checkRateLimit(
  _key: string,
  _limit: number,
  _window: number
): Promise<boolean> {
  // TODO: Implement rate limiting with Redis
  // For now, return true to allow all requests
  return true
} 