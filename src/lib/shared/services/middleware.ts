import { redirect } from 'next/navigation'
import { authService } from '@/lib/client/services/auth'

/**
 * Middleware to protect client-side routes
 * Provides a withAuth function to wrap components or functions
 */
export function withAuth<Input, Output>(
  action: (input: Input) => Promise<Output>
): (input: Input) => Promise<Output>;

export function withAuth<Args extends unknown[], Return>(
  action: (...args: Args) => Promise<Return>
): (...args: Args) => Promise<Return>;

export function withAuth(
  action: (...args: unknown[]) => Promise<unknown>
): (...args: unknown[]) => Promise<unknown> {
  return async (...args) => {
    const { session, error } = await authService.getSession()
    
    if (!session || error) {
      redirect('/login')
    }

    return action(...args)
  }
} 