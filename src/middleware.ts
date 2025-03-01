import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import logger from './lib/logger'

// Protected routes that require authentication and email verification
const PROTECTED_ROUTES = [
  '/family-tree',
  '/history-book',
  '/feed',
  '/create-story',
  '/account-settings',
  '/story'
]

// Auth routes that should redirect to family tree if already authenticated
const AUTH_ROUTES = ['/login', '/signup']

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  
  logger.debug({
    msg: 'Middleware execution start',
    url: request.nextUrl.pathname,
  })

  // Create a response object to modify
  const response = NextResponse.next({
    request,
  })

  // Create a Supabase client configured for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Apply each cookie to the response
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  try {
    // Get user data securely from the auth server
    const { data: { user } } = await supabase.auth.getUser()
    const isAuthenticated = !!user
    const isEmailVerified = user?.email_confirmed_at ? true : false
    
    // Current path
    const path = request.nextUrl.pathname
    
    // Handle auth routes (login/signup)
    if (AUTH_ROUTES.includes(path)) {
      if (isAuthenticated && isEmailVerified) {
        logger.info({
          msg: 'Redirecting authenticated user from auth page',
          from: path,
          to: '/family-tree',
          userId: user?.id
        })
        return NextResponse.redirect(new URL('/family-tree', request.url))
      }
      
      if (isAuthenticated && !isEmailVerified) {
        logger.info({
          msg: 'Redirecting unverified user to verification page',
          from: path,
          userId: user?.id
        })
        return NextResponse.redirect(new URL('/verify-email', request.url))
      }
    }
    
    // Handle verify-email page
    if (path === '/verify-email') {
      if (!isAuthenticated) {
        return NextResponse.redirect(new URL('/login', request.url))
      }
      
      if (isEmailVerified) {
        return NextResponse.redirect(new URL('/family-tree', request.url))
      }
    }
    
    // Handle protected routes
    if (PROTECTED_ROUTES.some(route => path.startsWith(route))) {
      if (!isAuthenticated) {
        logger.info({
          msg: 'No session for protected route, redirecting to login',
          path
        })
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', path)
        return NextResponse.redirect(redirectUrl)
      }
      
      if (!isEmailVerified) {
        logger.info({
          msg: 'Email not verified for protected route, redirecting to verification',
          path,
          userId: user?.id
        })
        return NextResponse.redirect(new URL('/verify-email', request.url))
      }
    }
  } catch (error) {
    logger.error({
      msg: 'Error in middleware',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      path: request.nextUrl.pathname
    })
  }

  const executionTime = Date.now() - startTime
  logger.info({
    msg: 'Middleware execution complete',
    url: request.nextUrl.pathname,
    executionTime: `${executionTime}ms`,
  })

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - .*\\.(?:svg|png|jpg|jpeg|gif|webp)$ (static image files)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
} 