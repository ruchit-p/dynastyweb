import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/shared/types/supabase'

/**
 * Creates a Supabase client for browser-side operations
 */
export function createClientSupabaseClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Create a singleton instance for client-side use
export const supabaseBrowser = createClientSupabaseClient() 