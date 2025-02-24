import { createServerSupabaseClient } from './supabase-admin'

/**
 * Higher-order function that wraps a server action with authentication
 */
export function withAuth<T extends (...args: any[]) => Promise<any>>(action: T) {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const supabase = createServerSupabaseClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('Not authenticated')
    }

    return action(...args)
  }
} 