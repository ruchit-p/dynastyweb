import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/supabase'
import { supabaseAdmin } from './supabase-admin'

/**
 * Creates a server-side Supabase client with cookie handling
 */
export function createServerSupabaseClient() {
  const cookieStore = cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
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
        }
      }
    }
  )
}

/**
 * Gets the currently authenticated user from the server context
 */
export async function getAuthenticatedUser() {
  const supabase = createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

/**
 * Checks if the current user has a specific role
 */
export async function hasRole(role: string) {
  const user = await getAuthenticatedUser()
  if (!user) return false
  
  const { data } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()
    
  return data?.role === role
}

/**
 * Checks if the current user has a specific permission
 */
export async function hasPermission(permission: string) {
  const user = await getAuthenticatedUser()
  if (!user) return false
  
  const { data } = await supabaseAdmin
    .from('user_permissions')
    .select('permission')
    .eq('user_id', user.id)
    .eq('permission', permission)
    .single()
    
  return !!data
} 