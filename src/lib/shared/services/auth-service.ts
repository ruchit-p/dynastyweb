/**
 * Auth utility functions
 * These pure functions can be used across both client and server contexts
 */

import { Session, User } from '@supabase/supabase-js'
import logger from '@/lib/logger'

/**
 * Check if email is verified from user object
 */
export const isEmailVerified = (user: User | null): boolean => {
  return !!user?.email_confirmed_at
}

/**
 * Get session expiry date
 */
export const getSessionExpiry = (session: Session | null): Date | null => {
  if (!session || !session.expires_at) return null
  return new Date(session.expires_at * 1000)
}

/**
 * Log authentication activity
 */
export const logAuthActivity = (
  action: string, 
  details: Record<string, unknown>
): void => {
  logger.info({
    msg: `Auth activity: ${action}`,
    ...details
  })
} 