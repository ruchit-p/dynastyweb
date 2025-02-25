import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

/**
 * Verifies that a CSRF token in the request matches the one stored in cookies
 * This should be used for sensitive operations like auth and data modification
 * 
 * Usage in API routes:
 * 
 * export async function POST(request: Request) {
 *   // Verify CSRF token
 *   const csrfResult = await verifyCSRFToken(request);
 *   if (!csrfResult.success) {
 *     return csrfResult.response;
 *   }
 *   
 *   // Continue with request processing
 * }
 */
export async function verifyCSRFToken(request: Request | NextRequest) {
  try {
    // Skip verification for non-mutating methods
    const method = request.method.toUpperCase();
    if (['GET', 'HEAD', 'OPTIONS', 'TRACE'].includes(method)) {
      return { success: true };
    }
    
    // Get stored token from cookies
    const storedToken = cookies().get('csrf_token')?.value;
    if (!storedToken) {
      console.error('CSRF validation failed: No token found in cookies');
      return {
        success: false,
        response: new NextResponse(
          JSON.stringify({ error: 'CSRF validation failed' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }
    
    // Get token from request
    let requestToken: string | undefined;
    
    // Try to get from form data
    if (request.headers.get('content-type')?.includes('application/x-www-form-urlencoded') || 
        request.headers.get('content-type')?.includes('multipart/form-data')) {
      const formData = await request.formData();
      requestToken = formData.get('csrf_token') as string | undefined;
    } 
    // Try to get from JSON body
    else if (request.headers.get('content-type')?.includes('application/json')) {
      const body = await request.json();
      requestToken = body.csrf_token;
      
      // Need to recreate the request since we've consumed the body
      const newRequest = new Request(request.url, {
        method: request.method,
        headers: request.headers,
        body: JSON.stringify(body),
      });
      
      // Return with the new request so it can be used further
      if (requestToken === storedToken) {
        return { success: true, request: newRequest };
      }
    }
    // Try to get from headers
    else {
      requestToken = request.headers.get('x-csrf-token') || undefined;
    }
    
    // Validate token
    if (!requestToken || requestToken !== storedToken) {
      console.error('CSRF validation failed: Token mismatch');
      return {
        success: false,
        response: new NextResponse(
          JSON.stringify({ error: 'CSRF validation failed' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error verifying CSRF token:', error);
    return {
      success: false,
      response: new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    };
  }
} 