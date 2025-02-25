'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/client/supabase-browser';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [localLoading, setLocalLoading] = useState(true);
  const [hasAuthenticated, setHasAuthenticated] = useState(false);

  useEffect(() => {
    // Double-check auth state to ensure we have accurate information
    const verifySession = async () => {
      try {
        // Create a fresh Supabase client to check auth state
        const supabase = createClient();
        console.log('Protected route checking session directly...');
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error checking session in ProtectedRoute', sessionError);
          setHasAuthenticated(false);
          setLocalLoading(false);
          return;
        }
        
        if (!session) {
          console.log('No session found in ProtectedRoute direct check');
          setHasAuthenticated(false);
          setLocalLoading(false);
          
          // Wait a moment before redirecting to avoid potential race conditions
          setTimeout(() => {
            if (!currentUser) {
              router.push('/login');
            }
          }, 100);
          return;
        }
        
        // We have a session, get the user details
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          console.error('Error getting user in ProtectedRoute', userError);
          setHasAuthenticated(false);
          setLocalLoading(false);
          return;
        }
        
        console.log('User authenticated in ProtectedRoute check:', {
          userId: user.id,
          email: user.email,
          emailVerified: user.email_confirmed_at ? 'yes' : 'no'
        });
        
        setHasAuthenticated(true);
        
        // Check email verification
        if (!user.email_confirmed_at) {
          toast({
            title: "Email verification required",
            description: "Please verify your email address to access this page.",
            variant: "destructive",
          });
          router.push('/verify-email');
        }
      } catch (error) {
        console.error('Error in ProtectedRoute verification:', error);
        setHasAuthenticated(false);
      } finally {
        setLocalLoading(false);
      }
    };

    if (!loading) {
      if (!currentUser) {
        verifySession();
      } else if (!currentUser.email_confirmed_at) {
        toast({
          title: "Email verification required",
          description: "Please verify your email address to access this page.",
          variant: "destructive",
        });
        router.push('/verify-email');
        setLocalLoading(false);
      } else {
        // User is authenticated and verified
        setHasAuthenticated(true);
        setLocalLoading(false);
      }
    }
  }, [currentUser, loading, router, toast]);

  if (loading || localLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A5C36]"></div>
      </div>
    );
  }

  // Show children only if the user is authenticated and email is verified
  if (!hasAuthenticated && !(currentUser && currentUser.email_confirmed_at)) {
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