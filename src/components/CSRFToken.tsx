'use client'

import { useEffect, useState } from 'react'
import { cookies } from 'next/headers'

interface CSRFTokenProps {
  value?: string // Optional value if token is provided server-side
}

/**
 * Component to include a CSRF token in forms
 * 
 * Usage:
 * <form action="/api/submit" method="POST">
 *   <CSRFToken />
 *   <input type="text" name="data" />
 *   <button type="submit">Submit</button>
 * </form>
 */
export function CSRFToken({ value }: CSRFTokenProps) {
  const [csrfToken, setCsrfToken] = useState<string>(value || '')

  // If token wasn't provided as prop, try to get it from cookie on client-side
  useEffect(() => {
    if (!value) {
      // Try to get token from cookie
      const getCookieValue = (name: string) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) {
          return parts.pop()?.split(';').shift() || '';
        }
        return '';
      };

      const token = getCookieValue('csrf_token');
      if (token) {
        setCsrfToken(token);
      }
    }
  }, [value]);

  return <input type="hidden" name="csrf_token" value={csrfToken} />;
}

/**
 * Server-side function to get the CSRF token from a cookie
 * Use this when rendering the form server-side to avoid hydration issues
 */
export function getCSRFToken() {
  try {
    const token = cookies().get('csrf_token')?.value || '';
    return token;
  } catch (error) {
    // We're in a client component
    return '';
  }
} 