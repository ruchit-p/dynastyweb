'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/client/supabase-browser';

interface AuthGuardProps {
  children: React.ReactNode;
  requiredVerification?: boolean; // If true, requires email verification
  fallbackUrl?: string; // Where to redirect if not authenticated
}

/**
 * A client-side component that guards routes requiring authentication
 * 
 * This provides an additional layer of protection beyond middleware
 * and handles dynamic client-side navigation
 */
export default function AuthGuard({ 
  children,
  requiredVerification = true,
  fallbackUrl = '/login'
}: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  
  useEffect(() => {
    // Check session on component mount and when pathname changes
    const checkSession = async () => {
      try {
        setIsLoading(true);
        const supabase = createClient();
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth error:', error.message);
          setIsAuthenticated(false);
          router.push(`${fallbackUrl}?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
        
        if (!session) {
          // No session, redirect to login
          setIsAuthenticated(false);
          router.push(`${fallbackUrl}?redirect=${encodeURIComponent(pathname)}`);
          return;
        }
        
        setIsAuthenticated(true);
        
        // Check verification if required
        if (requiredVerification) {
          const isEmailVerified = !!session.user.email_confirmed_at;
          setIsVerified(isEmailVerified);
          
          if (!isEmailVerified) {
            // Email not verified, redirect to verification page
            router.push('/verify-email');
            return;
          }
        }
      } catch (error) {
        console.error('Failed to check auth status:', error instanceof Error ? error.message : 'Unknown error');
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
    
    // Also set up auth state listener
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        router.push(fallbackUrl);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsAuthenticated(true);
        setIsVerified(!!session?.user.email_confirmed_at);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, fallbackUrl, pathname, requiredVerification]);

  // Show nothing while loading
  if (isLoading) {
    return null; // Or return a loading indicator
  }

  // Show children only when authenticated (and verified if required)
  if (isAuthenticated && (!requiredVerification || isVerified)) {
    return <>{children}</>;
  }

  // This would only show briefly before redirect happens
  return null;
} 

