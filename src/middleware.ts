import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Check if the path is a protected route
  const isProtectedRoute = 
    pathname.startsWith('/family-tree') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/history-book') ||
    pathname.startsWith('/events') ||
    pathname.startsWith('/settings')
  
  // Check if the path is an auth route
  const isAuthRoute = 
    pathname === '/auth' || 
    pathname === '/login' || 
    pathname === '/signup' ||
    pathname === '/verify-email' ||
    pathname === '/verify-phone' ||
    pathname === '/forgot-password'
  
  // Check if we have a session cookie
  const authCookie = request.cookies.get('firebase-auth-token')
  const hasAuthCookie = !!authCookie?.value
  
  // For protected routes: redirect to /auth if not authenticated
  if (isProtectedRoute && !hasAuthCookie) {
    const redirectUrl = new URL('/auth', request.url)
    redirectUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(redirectUrl)
  }
  
  // For auth routes: redirect to /family-tree if already authenticated
  if (isAuthRoute && hasAuthCookie) {
    return NextResponse.redirect(new URL('/family-tree', request.url))
  }
  
  // Handle any redirects for obsolete routes
  if (pathname === '/login' || pathname === '/signup') {
    const mode = pathname === '/signup' ? 'signup' : 'signin'
    const redirectUrl = new URL('/auth', request.url)
    redirectUrl.searchParams.set('mode', mode)
    
    // Preserve any query parameters from the original URL
    for (const [key, value] of request.nextUrl.searchParams.entries()) {
      if (key !== 'mode') {
        redirectUrl.searchParams.set(key, value)
      }
    }
    
    return NextResponse.redirect(redirectUrl)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files, api routes, and _next
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|api/.*$).*)',
  ],
} 