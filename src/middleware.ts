import { NextResponse, type NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/shared/types/supabase'

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

export async function middleware(request: NextRequest) {
  try {
    console.log('=== Middleware Start ===');
    console.log('Request path:', request.nextUrl.pathname);
    
    // Create a response object to modify
    const response = NextResponse.next();

    // Create a Supabase client for the middleware
    const supabase = createMiddlewareClient<Database>({ 
      req: request, 
      res: response 
    });
    
    console.log('Checking session in middleware...');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('Middleware session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      emailConfirmed: session?.user?.email_confirmed_at
    });

    // Check if we're accessing auth pages (login/signup)
    const isAuthPage = AUTH_ROUTES.some(route => 
      request.nextUrl.pathname === route
    );
    console.log('Auth page check:', { isAuthPage, path: request.nextUrl.pathname });

    if (isAuthPage) {
      if (session) {
        const { data: { user } } = await supabase.auth.getUser();
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
      return response;
    }

    // Check if we're accessing the verify-email page
    if (request.nextUrl.pathname === '/verify-email') {
      console.log('Verify email page access');
      if (!session) {
        console.log('No session, redirecting to login');
        const redirectUrl = new URL('/login', request.url);
        return NextResponse.redirect(redirectUrl);
      }

      const { data: { user } } = await supabase.auth.getUser();
      console.log('Verify email user check:', {
        hasUser: !!user,
        emailConfirmed: user?.email_confirmed_at
      });
      
      if (user?.email_confirmed_at) {
        console.log('Email already verified, redirecting to family tree');
        const redirectUrl = new URL('/family-tree', request.url);
        return NextResponse.redirect(redirectUrl);
      }

      return response;
    }

    // Check if the path is protected
    const isProtectedPath = PROTECTED_ROUTES.some(route => 
      request.nextUrl.pathname.startsWith(route)
    );
    console.log('Protected route check:', { isProtectedPath, path: request.nextUrl.pathname });

    if (isProtectedPath) {
      if (!session) {
        console.log('No session for protected route, redirecting to login');
        // Store the current URL as the redirect target
        const redirectUrl = new URL('/login', request.url);
        redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
      }

      const { data: { user } } = await supabase.auth.getUser();
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

    console.log('=== Middleware Complete ===');
    return response;
  } catch (error) {
    console.error('Auth middleware error:', error);
    // On error, redirect to login with the current path as redirect target
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }
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