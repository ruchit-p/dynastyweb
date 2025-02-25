import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const type = requestUrl.searchParams.get('type') || 'signup'

  let redirectUrl: URL
  let response: NextResponse
  
  try {
    if (code) {
      console.log('Auth callback received with code and type:', { type })
      
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
                console.log('Setting cookies in auth callback:', cookiesToSet.map(c => c.name))
                cookiesToSet.forEach(({ name, value, options }) => {
                  cookieStore.set(name, value, options)
                })
              } catch (error) {
                console.error('Error setting cookies in auth callback:', error)
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
      console.log('Exchanging code for session...')
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('Auth callback error in exchangeCodeForSession:', sessionError)
        redirectUrl = new URL('/auth/verification-error', request.url)
        redirectUrl.searchParams.set('error', sessionError.message)
        response = NextResponse.redirect(redirectUrl)
        return response
      }
      
      console.log('Session established:', {
        hasSession: !!sessionData?.session,
        hasAccessToken: !!sessionData?.session?.access_token,
        expiresAt: sessionData?.session?.expires_at
      })
      
      // Get user information
      console.log('Getting user information...')
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError) {
        console.error('Auth callback error in getUser:', userError)
        redirectUrl = new URL('/auth/verification-error', request.url)
        redirectUrl.searchParams.set('error', userError.message)
        response = NextResponse.redirect(redirectUrl)
        return response
      }
      
      // Determine where to redirect based on verification status and type
      if (!user) {
        console.error('Auth callback error: User not found after successful auth')
        redirectUrl = new URL('/auth/verification-error', request.url)
        redirectUrl.searchParams.set('error', 'User not found after authentication')
      } else if (type === 'recovery') {
        // Password reset flow
        console.log('Redirecting to password reset page')
        redirectUrl = new URL('/auth/reset-password', request.url)
      } else if (user.email_confirmed_at) {
        // Successfully verified - send to main app
        console.log('Email verified, redirecting to family tree')
        redirectUrl = new URL('/family-tree', request.url) 
        redirectUrl.searchParams.set('verified', 'true')
      } else {
        // User exists but email not confirmed - direct to verification page
        console.log('Email not confirmed, redirecting to verification page')
        redirectUrl = new URL('/verify-email', request.url)
      }
    } else {
      // No code provided, redirect to login
      console.log('No code provided in auth callback, redirecting to login')
      redirectUrl = new URL('/login', request.url)
    }
  } catch (error) {
    // Handle any unexpected errors
    console.error('Unexpected error in auth callback:', error)
    redirectUrl = new URL('/auth/verification-error', request.url)
    redirectUrl.searchParams.set('error', 'An unexpected error occurred')
  }

  console.log('Auth callback redirecting to:', redirectUrl.pathname)
  response = NextResponse.redirect(redirectUrl)
  return response
} 