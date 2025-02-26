'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/client/supabase-browser';
import { createLogger } from '@/lib/client/logger';

// Create a component-specific logger
const logger = createLogger('ProtectedRoute');

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser: user, session, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [localLoading, setLocalLoading] = useState(true);
  const [hasAuthenticated, setHasAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Double-check auth state to ensure we have accurate information
    const verifySession = async () => {
      try {
        // Create a fresh Supabase client to check auth state
        const supabase = await createClient();
        logger.debug('Checking session directly', { method: 'verifySession' });
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          logger.error('Error checking session', { 
            error: sessionError.message,
            method: 'verifySession'
          });
          setHasAuthenticated(false);
          setAuthChecked(true);
          setLocalLoading(false);
          return;
        }
        
        if (!session) {
          logger.info('No session found in direct check', { method: 'verifySession' });
          setHasAuthenticated(false);
          setAuthChecked(true);
          setLocalLoading(false);
          
          // Wait a moment before redirecting to avoid potential race conditions
          setTimeout(() => {
            if (!user) {
              router.push('/login');
            }
          }, 500); // Increased from 100ms to 500ms for more reliability
          return;
        }
        
        // We have a session, get the user details
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          logger.error('Error getting user', { 
            error: userError?.message || 'No user returned',
            method: 'verifySession'
          });
          setHasAuthenticated(false);
          setAuthChecked(true);
          setLocalLoading(false);
          return;
        }
        
        logger.info('User authenticated', {
          userId: user.id,
          emailVerified: user.email_confirmed_at ? true : false,
          method: 'verifySession'
        });
        
        setHasAuthenticated(true);
        setAuthChecked(true);
        
        // Check email verification
        if (!user.email_confirmed_at) {
          logger.warn('Email not verified', { userId: user.id });
          toast({
            title: "Email verification required",
            description: "Please verify your email address to access this page.",
            variant: "destructive",
          });
          router.push('/verify-email');
        }
      } catch (error) {
        logger.error('Verification error', { 
          error: error instanceof Error ? error.message : 'Unknown error',
          method: 'verifySession'
        });
        setHasAuthenticated(false);
        setAuthChecked(true);
      } finally {
        setLocalLoading(false);
      }
    };

    // Only check session if loading from context is complete
    if (!loading) {
      // Use the user from context if available
      if (user && user.email_confirmed_at) {
        logger.info('User authenticated from context', { 
          userId: user.id
        });
        setHasAuthenticated(true);
        setAuthChecked(true);
        setLocalLoading(false);
      } else if (user && !user.email_confirmed_at) {
        logger.warn('Email not verified (from context)', { 
          userId: user.id 
        });
        toast({
          title: "Email verification required",
          description: "Please verify your email address to access this page.",
          variant: "destructive",
        });
        router.push('/verify-email');
        setAuthChecked(true);
        setLocalLoading(false);
      } else {
        // If no user in context, verify session
        verifySession();
      }
    }
  }, [user, loading, router, toast]);

  // Show loading state until checks complete
  if (loading || localLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A5C36]"></div>
      </div>
    );
  }

  // Show children only if the user is authenticated and email is verified
  if (authChecked && !hasAuthenticated && !(user && user.email_confirmed_at)) {
    logger.info('Access denied - not authenticated', {});
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <h1 className="text-2xl font-semibold mb-4">Not Authenticated</h1>
        <p className="mb-6">Please sign in to view your family tree.</p>
        <button 
          onClick={() => router.push('/login')}
          className="px-4 py-2 bg-[#0A5C36] text-white rounded-md hover:bg-[#0A4C2E] transition-colors"
        >
          Sign In
        </button>
      </div>
    );
  }
  
  return <>{children}</>;
} 