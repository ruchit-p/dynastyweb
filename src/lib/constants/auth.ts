/**
 * Routes that are accessible to both authenticated and unauthenticated users
 */
export const PUBLIC_ROUTES: string[] = [
  '/login',
  '/signup',
  '/verify',
  '/reset-password',
  '/api',  // API routes typically handle their own auth
  '/_next', // Next.js internal routes
]

/**
 * Routes that require authentication
 */
export const PRIVATE_ROUTES: string[] = [
  '/profile',
  '/family-tree',
  '/story',
  '/settings',
  '/dashboard',
] 