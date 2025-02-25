import { createClient } from './supabase'

/**
 * Higher-order function that wraps a server action with authentication
 */
export function withAuth<T extends (...args: unknown[]) => Promise<unknown>>(action: T) {
  return async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const supabase = await createClient()
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      throw new Error('Not authenticated')
    }

    return action(...args) as ReturnType<T>
  }
} 