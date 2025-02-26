import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/shared/types/supabase'

/**
 * Creates a Supabase client for browser-side operations
 * This should be the only method used across the app for creating browser clients
 */
export function createClient() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_URL')
  }
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Missing env.NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

/**
 * Singleton instance of the browser client for use across components
 * Import this when you need a browser-side Supabase client
 */
export const supabaseBrowser = createClient() 