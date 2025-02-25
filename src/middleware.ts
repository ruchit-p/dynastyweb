import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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
  console.log('=== Middleware Start ===')
  console.log('Request path:', request.nextUrl.pathname)
  console.log('Checking session in middleware...')

  // Create a response object to modify
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Create a Supabase client configured for middleware
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const cookies = request.cookies.getAll()
          console.log('[Middleware] Getting all cookies:', cookies.map(c => c.name))
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
            console.log(`[Middleware] Setting cookie ${name}`)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Check if we have a session
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  // Log session status
  if (sessionError) {
    console.error('Error getting session in middleware:', sessionError)
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

      console.log('Middleware session check:', {
        hasSession: !!session,
        hasUser: !!user,
        userId,
        email,
        emailConfirmed,
      })

      // For public routes that don't need auth, e.g., login page
      if (PUBLIC_ROUTES.some((route: string) => request.nextUrl.pathname.startsWith(route))) {
        // If user is logged in, redirect to home page or dashboard
        if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup') {
          console.log('Redirecting authenticated user from auth page to dashboard')
          return NextResponse.redirect(new URL('/family-tree', request.url))
        }
      }

      // Check if we're accessing auth pages (login/signup)
      const isAuthPage = AUTH_ROUTES.some(route => 
        request.nextUrl.pathname === route
      );
      console.log('Auth page check:', { isAuthPage, path: request.nextUrl.pathname });

      if (isAuthPage) {
        if (user) {
          console.log('Auth page with session:', {
            hasUser: !!user,
            emailConfirmed: user?.email_confirmed_at
          });
          
          if (user?.email_confirmed_at) {
            console.log('Redirecting authenticated user to family tree');
            const redirectUrl = new URL('/family-tree', request.url);
            return NextResponse.redirect(redirectUrl);
          } else {
            console.log('Redirecting unverified user to verification');
            const redirectUrl = new URL('/verify-email', request.url);
            return NextResponse.redirect(redirectUrl);
          }
        }
        return supabaseResponse;
      }

      // Check if we're accessing the verify-email page
      if (request.nextUrl.pathname === '/verify-email') {
        console.log('Verify email page access');
        if (!user) {
          console.log('No session, redirecting to login');
          const redirectUrl = new URL('/login', request.url);
          return NextResponse.redirect(redirectUrl);
        }

        console.log('Verify email user check:', {
          hasUser: !!user,
          emailConfirmed: user?.email_confirmed_at
        });
        
        if (user?.email_confirmed_at) {
          console.log('Email already verified, redirecting to family tree');
          const redirectUrl = new URL('/family-tree', request.url);
          return NextResponse.redirect(redirectUrl);
        }

        return supabaseResponse;
      }

      // Check if the path is protected
      const isProtectedPath = PROTECTED_ROUTES.some(route => 
        request.nextUrl.pathname.startsWith(route)
      );
      console.log('Protected route check:', { isProtectedPath, path: request.nextUrl.pathname });

      if (isProtectedPath) {
        if (!user) {
          console.log('No session for protected route, redirecting to login');
          // Store the current URL as the redirect target
          const redirectUrl = new URL('/login', request.url);
          redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
          return NextResponse.redirect(redirectUrl);
        }

        console.log('Protected route user check:', {
          hasUser: !!user,
          emailConfirmed: user?.email_confirmed_at
        });
        
        if (!user?.email_confirmed_at) {
          console.log('Email not verified for protected route, redirecting to verification');
          const redirectUrl = new URL('/verify-email', request.url);
          return NextResponse.redirect(redirectUrl);
        }
      }
    } else {
      // No session found
      console.log('No session found in middleware')

      // Check if the request is for a private route
      if (PRIVATE_ROUTES.some((route: string) => request.nextUrl.pathname.startsWith(route))) {
        console.log('Redirecting unauthenticated user to login')
        // Redirect to login page
        const redirectUrl = new URL('/login', request.url)
        redirectUrl.searchParams.set('redirect', request.nextUrl.pathname)
        return NextResponse.redirect(redirectUrl)
      }
    }
  } catch (error) {
    console.error('Error in middleware:', error)
  }

  // Return the response with the cookies
  console.log('=== Middleware End ===')
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all protected routes and auth pages:
     * - /family-tree/*
     * - /history-book/*
     * - /feed/*
     * - /create-story/*
     * - /account-settings/*
     * - /story/*
     * - /login
     * - /signup
     * - /verify-email
     */
    '/family-tree/:path*',
    '/history-book/:path*',
    '/feed/:path*',
    '/create-story/:path*',
    '/account-settings/:path*',
    '/story/:path*',
    '/login',
    '/signup',
    '/verify-email'
  ]
} 