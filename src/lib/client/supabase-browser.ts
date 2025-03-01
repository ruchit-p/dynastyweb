/**
 * Singleton browser client for Supabase
 * 
 * This provides a consistent instance of the Supabase client
 * for client-side components to reuse.
 */
import { createClient } from '@/lib/supabase'
import { SupabaseClient } from '@supabase/supabase-js'

// Create a singleton browser client
let supabaseInstance: SupabaseClient | null = null

// Get the singleton instance
function getInstance(): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient()
  }
  return supabaseInstance
}

// Export the browser client singleton
export const supabaseBrowser = getInstance()

// Also export the function to create a new instance if needed
export default getInstance 