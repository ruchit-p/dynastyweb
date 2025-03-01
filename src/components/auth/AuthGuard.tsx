'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { createLogger } from '@/lib/client/logger';
import { useAuth } from './AuthContext';
import { useToast } from '@/components/ui/use-toast';

// Create a logger for AuthGuard
const logger = createLogger('AuthGuard');

interface AuthGuardProps {
  children: React.ReactNode;
  requiredVerification?: boolean; // If true, requires email verification
  fallbackUrl?: string; // Where to redirect if not authenticated
  showLoading?: boolean; // Whether to show loading indicator
  verifyWithContext?: boolean; // Whether to check auth in AuthContext first
}

/**
 * A client-side component that guards routes requiring authentication
 * 
 * This provides protection for routes that require authentication and/or email verification.
 */
export default function AuthGuard({ 
  children,
  requiredVerification = true,
  fallbackUrl = '/login',
  showLoading = true,
  verifyWithContext = true
}: AuthGuardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [hasAuthenticated, setHasAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  
  // Always call hooks at the top level
  const auth = useAuth();

  useEffect(() => {
    // Check session on component mount and when pathname changes
    const checkSession = async () => {
      try {
        setIsLoading(true);
        
        // If using context and auth is loaded, use that state first
        if (verifyWithContext && !auth?.loading) {
          const user = auth?.currentUser;
          
          if (user) {
            logger.info('User authenticated from context', { 
              userId: user.id
            });
            
            setIsAuthenticated(true);
            setHasAuthenticated(true);
            setAuthChecked(true);
            
            // Check email verification if required
            if (requiredVerification && !user.email_confirmed_at) {
              logger.warn('Email not verified (from context)', { 
                userId: user.id 
              });
              
              toast({
                title: "Email verification required",
                description: "Please verify your email address to access this page.",
                variant: "destructive",
              });
              
              router.push('/verify-email');
              setIsVerified(false);
            } else {
              setIsVerified(true);
            }
            
            setIsLoading(false);
            return;
          }
        }
        
        // Direct Supabase session check if context not available or not loaded
        const supabase = createClient();
        
        // First verify user is authenticated using getUser()
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          logger.error('Auth error', { 
            error: userError.message,
            pathname
          });
          setIsAuthenticated(false);
          setIsVerified(false);
          setIsLoading(false);
          return;
        }
        
        if (!user) {
          logger.debug('No authenticated user found', { pathname });
          setIsAuthenticated(false);
          setIsVerified(false);
          setIsLoading(false);
          return;
        }
        
        // Now that we've verified the user, get the session for additional data if needed
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          logger.error('Session error', { 
            error: sessionError.message,
            pathname
          });
          setIsAuthenticated(false);
          setIsVerified(false);
          setIsLoading(false);
          return;
        }
        
        setIsAuthenticated(true);
        setHasAuthenticated(true);
        setAuthChecked(true);
        
        logger.debug('Session found, user is authenticated', { 
          userId: session.user.id,
          pathname 
        });
        
        // Check verification if required
        if (requiredVerification) {
          const isEmailVerified = !!session.user.email_confirmed_at;
          setIsVerified(isEmailVerified);
          
          if (!isEmailVerified) {
            // Email not verified, redirect to verification page
            logger.debug('Email not verified, redirecting to verification page', {
              userId: session.user.id
            });
            
            toast({
              title: "Email verification required",
              description: "Please verify your email address to access this page.",
              variant: "destructive",
            });
            
            router.push('/verify-email');
            return;
          }
        } else {
          setIsVerified(true);
        }
      } catch (error) {
        logger.error('Failed to check auth status', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        });
        setIsAuthenticated(false);
        setHasAuthenticated(false);
        setAuthChecked(true);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
    
    // Also set up auth state listener
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.debug('Auth state changed', { event });
      
      if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setHasAuthenticated(false);
        router.push(fallbackUrl);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setIsAuthenticated(true);
        setHasAuthenticated(true);
        setIsVerified(!!session?.user.email_confirmed_at);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [auth, router, fallbackUrl, pathname, requiredVerification, verifyWithContext, toast]);

  // Show loading state while checking
  if (isLoading && showLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A5C36]"></div>
      </div>
    );
  }

  // Show children only when authenticated (and verified if required)
  if (isAuthenticated && (!requiredVerification || isVerified)) {
    return <>{children}</>;
  }

  // Show access denied message if auth is checked and user is not authenticated
  if (authChecked && !hasAuthenticated && showLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <h1 className="text-2xl font-semibold mb-4">Not Authenticated</h1>
        <p className="mb-6">Please sign in to view this page.</p>
        <button 
          onClick={() => router.push(`${fallbackUrl}?redirect=${encodeURIComponent(pathname)}`)}
          className="px-4 py-2 bg-[#0A5C36] text-white rounded-md hover:bg-[#0A4C2E] transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }

  // Default case - render nothing while redirecting
  return null;
} 

