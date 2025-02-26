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

// Public routes accessible to all users
const PUBLIC_ROUTES = [
  '/login',
  '/signup',
  '/verify-email',
  '/reset-password',
  '/api',
  '/_next',
]

// Private routes requiring authentication
const PRIVATE_ROUTES = [
  '/family-tree',
  '/history-book',
  '/feed',
  '/create-story',
  '/account-settings',
  '/story',
]

// This function can be marked `async` if using `await` inside
export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  
  logger.debug({
    msg: 'Middleware execution start',
    url: request.nextUrl.pathname,
  })

  // Create a response object to modify
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Create a Supabase client configured for middleware
  // The session is automatically refreshed by the Supabase SDK if it's expired
  // Note: @supabase/ssr automatically refreshes access tokens when they expire (autoRefreshToken is true by default)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = request.cookies.getAll()
          logger.debug({
            msg: 'Getting all cookies in middleware',
            cookies: cookies.map(c => c.name)
          })
          return cookies
        },
        setAll(cookiesToSet) {
          // First set the cookies on the request
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value)
          })
          
          // Create a fresh response and set cookies there too
          supabaseResponse = NextResponse.next({
            request,
          })
          
          // Apply each cookie to the response
          cookiesToSet.forEach(({ name, value, options }) => {
            logger.debug({
              msg: 'Setting cookie in middleware',
              cookie: name
            })
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
      // Explicitly set auth options to ensure token refresh behavior
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    }
  )

  // Check if we have a session
  // This will automatically refresh the access token if it's expired
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  // Log session status
  if (sessionError) {
    logger.error({
      msg: 'Error getting session in middleware',
      error: {
        message: sessionError.message,
        name: sessionError.name,
        stack: sessionError.stack
      }
    })
  }
  
  // Log token expiry info for debugging
  if (session && session.expires_at) {
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = expiresAt - now;
    
    logger.debug({
      msg: 'Token expiry info',
      expiresIn: `${expiresIn} seconds`,
      expiresAt: new Date(expiresAt * 1000).toISOString(),
      now: new Date(now * 1000).toISOString(),
      tokenRefreshed: expiresIn < 3600, // Token was refreshed if expiry is more than an hour away
    });
  }
  
  try {
    if (session) {
      // If we have a valid session
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const userId = user?.id || null
      const email = user?.email || null
      const emailConfirmed = user?.email_confirmed_at ? 'yes' : 'no'

      logger.debug({
        msg: 'Session check in middleware',
        hasSession: !!session,
        hasUser: !!user,
        userId,
        email: email ? `${email.substring(0, 3)}***@${email.split('@')[1]}` : null, // Partial email for privacy
        emailConfirmed,
      })

      // For public routes that don't need auth, e.g., login page
      if (PUBLIC_ROUTES.some((route: string) => request.nextUrl.pathname.startsWith(route))) {
        // If user is logged in, redirect to home page or dashboard
        if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') {
          logger.info({
            msg: 'Redirecting authenticated user from auth page',
            from: request.nextUrl.pathname,
            to: '/family-tree',
            userId
          })
          return NextResponse.redirect(new URL('/family-tree', request.url))
        }
      }

      // Check if we're accessing auth pages (login/signup)
      const isAuthPage = AUTH_ROUTES.some(route => 
        request.nextUrl.pathname === route
      );
      
      logger.debug({
        msg: 'Auth page check',
        isAuthPage,
        path: request.nextUrl.pathname
      })

      if (isAuthPage) {
        if (user) {
          logger.debug({
            msg: 'Auth page access with active session',
            hasUser: !!user,
            emailConfirmed: !!user?.email_confirmed_at,
            userId
          })
          
          if (user?.email_confirmed_at) {
            logger.info({
              msg: 'Redirecting authenticated user to family tree',
              from: request.nextUrl.pathname,
              userId
            })
            const redirectUrl = new URL('/family-tree', request.url);
            return NextResponse.redirect(redirectUrl);
          } else {
            logger.info({
              msg: 'Redirecting unverified user to verification page',
              from: request.nextUrl.pathname,
              userId
            })
            const redirectUrl = new URL('/verify-email', request.url);
            return NextResponse.redirect(redirectUrl);
          }
        }
        return supabaseResponse;
      }

      // Check if we're accessing the verify-email page
      if (request.nextUrl.pathname === '/verify-email') {
        logger.debug({
          msg: 'Verify email page access',
          path: request.nextUrl.pathname
        })
        
        if (!user) {
          logger.info({
            msg: 'No session for verify-email page, redirecting to login'
          })
          const redirectUrl = new URL('/login', request.url);
          return NextResponse.redirect(redirectUrl);
        }

        logger.debug({
          msg: 'Verify email user check',
          hasUser: !!user,
          emailConfirmed: !!user?.email_confirmed_at,
          userId
        })
        
        if (user?.email_confirmed_at) {
          logger.info({
            msg: 'Email already verified, redirecting to family tree',
            userId
          })
          const redirectUrl = new URL('/family-tree', request.url);
          return NextResponse.redirect(redirectUrl);
        }

        return supabaseResponse;
      }

      // Check if the path is protected
      const isProtectedPath = PROTECTED_ROUTES.some(route => 
        request.nextUrl.pathname.startsWith(route)
      );
      
      logger.debug({
        msg: 'Protected route check',
        isProtectedPath,
        path: request.nextUrl.pathname
      })

      if (isProtectedPath) {
        if (!user) {
          logger.info({
            msg: 'No session for protected route, redirecting to login',
            path: request.nextUrl.pathname
          })
          // Store the current URL as the redirect target
          const redirectUrl = new URL('/login', request.url);
          redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
          return NextResponse.redirect(redirectUrl);
        }

        logger.debug({
          msg: 'Protected route user check',
          hasUser: !!user,
          emailConfirmed: !!user?.email_confirmed_at,
          userId
        })
        
        if (!user?.email_confirmed_at) {
          logger.info({
            msg: 'Email not verified for protected route, redirecting to verification',
            path: request.nextUrl.pathname,
            userId
          })
          const redirectUrl = new URL('/verify-email', request.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    } else {
      // No session found
      logger.debug({
        msg: 'No session found in middleware'
      })

      // Check if the request is for a private route
      if (PRIVATE_ROUTES.some((route: string) => request.nextUrl.pathname.startsWith(route))) {
        logger.info({
          msg: 'Redirecting unauthenticated user to login',
          path: request.nextUrl.pathname
        })
        // Redirect to login page
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
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

  // Return the response with the cookies
  return supabaseResponse
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