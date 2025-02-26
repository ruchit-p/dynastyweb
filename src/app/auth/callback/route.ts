import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import logger from '@/lib/logger'
import { apiPerformanceHandler } from '@/lib/performance'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const perfHandler = apiPerformanceHandler('GET /auth/callback');
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type') || 'signup'

  let redirectUrl: URL
  let response: NextResponse
  
  try {
    if (code) {
      logger.info({
        msg: 'Auth callback received',
        type,
        endpoint: '/auth/callback'
      });
      
      const cookieStore = await cookies()
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(cookiesToSet) {
              try {
                logger.debug({
                  msg: 'Setting cookies in auth callback',
                  cookieNames: cookiesToSet.map(c => c.name),
                  endpoint: '/auth/callback'
                });
                
                cookiesToSet.forEach(({ name, value, options }) => {
                  cookieStore.set(name, value, options)
                })
              } catch (error) {
                logger.error({
                  msg: 'Error setting cookies in auth callback',
                  error: error instanceof Error ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                  } : 'Unknown error',
                  endpoint: '/auth/callback'
                });
              }
            },
          },
          auth: {
            persistSession: true,
            autoRefreshToken: true
          }
        }
      )
      
      // Exchange the code for a session
      logger.debug({
        msg: 'Exchanging code for session',
        endpoint: '/auth/callback'
      });
      
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        logger.error({
          msg: 'Auth callback error in exchangeCodeForSession',
          error: {
            message: sessionError.message,
            code: sessionError.code,
            name: sessionError.name
          },
          endpoint: '/auth/callback'
        });
        
        redirectUrl = new URL('/auth/verification-error', request.url)
        redirectUrl.searchParams.set('error', sessionError.message)
        response = NextResponse.redirect(redirectUrl)
        perfHandler.end('error', { error: 'session_exchange_error' });
        return response
      }
      
      logger.debug({
        msg: 'Session established',
        hasSession: !!sessionData?.session,
        hasAccessToken: !!sessionData?.session?.access_token,
        expiresAt: sessionData?.session?.expires_at,
        endpoint: '/auth/callback'
      });
      
      // Get user information
      logger.debug({
        msg: 'Getting user information',
        endpoint: '/auth/callback'
      });
      
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        logger.error({
          msg: 'Auth callback error in getUser',
          error: {
            message: userError.message,
            code: userError.code,
            name: userError.name
          },
          endpoint: '/auth/callback'
        });
        
        redirectUrl = new URL('/auth/verification-error', request.url)
        redirectUrl.searchParams.set('error', userError.message)
        response = NextResponse.redirect(redirectUrl)
        perfHandler.end('error', { error: 'get_user_error' });
        return response
      }
      
      // Determine where to redirect based on verification status and type
      if (!user) {
        logger.error({
          msg: 'Auth callback error: User not found after successful auth',
          endpoint: '/auth/callback'
        });
        
        redirectUrl = new URL('/auth/verification-error', request.url)
        redirectUrl.searchParams.set('error', 'User not found after authentication')
      } else if (type === 'recovery') {
        // Password reset flow
        logger.info({
          msg: 'Redirecting to password reset page',
          userId: user.id,
          endpoint: '/auth/callback'
        });
        
        redirectUrl = new URL('/auth/reset-password', request.url)
      } else if (user.email_confirmed_at) {
        // Successfully verified - send to main app
        logger.info({
          msg: 'Email verified, redirecting to family tree',
          userId: user.id,
          emailConfirmedAt: user.email_confirmed_at,
          endpoint: '/auth/callback'
        });
        
        redirectUrl = new URL('/family-tree', request.url) 
        redirectUrl.searchParams.set('verified', 'true')
      } else {
        // User exists but email not confirmed - direct to verification page
        logger.info({
          msg: 'Email not confirmed, redirecting to verification page',
          userId: user.id,
          endpoint: '/auth/callback'
        });
        
        redirectUrl = new URL('/verify-email', request.url)
      }
    } else {
      // No code provided, redirect to login
      logger.info({
        msg: 'No code provided in auth callback, redirecting to login',
        endpoint: '/auth/callback'
      });
      
      redirectUrl = new URL('/login', request.url)
    }
  } catch (error) {
    // Handle any unexpected errors
    logger.error({
      msg: 'Unexpected error in auth callback',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/auth/callback'
    });
    
    redirectUrl = new URL('/auth/verification-error', request.url)
    redirectUrl.searchParams.set('error', 'An unexpected error occurred')
    perfHandler.end('error', { error: 'unexpected_error' });
  }

  logger.info({
    msg: 'Auth callback redirecting',
    path: redirectUrl.pathname,
    endpoint: '/auth/callback'
  });
  
  response = NextResponse.redirect(redirectUrl)
  perfHandler.end('success', { redirectPath: redirectUrl.pathname });
  return response
} 