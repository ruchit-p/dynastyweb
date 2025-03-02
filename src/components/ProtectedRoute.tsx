'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  // Add debug logging
  console.log('ProtectedRoute state:', { 
    currentUser: currentUser ? { 
      uid: currentUser.uid, 
      email: currentUser.email,
      emailVerified: currentUser.emailVerified
    } : null, 
    loading 
  });

  useEffect(() => {
    // Set a timeout to detect if we're stuck in loading state
    const loadingTimeout = setTimeout(() => {
      if (loading) {
        console.warn('Authentication loading state has been active for more than 5 seconds');
      }
    }, 5000);

    if (!loading) {
      if (!currentUser) {
        console.log('No current user, redirecting to login');
        router.push('/login');
      } else if (!currentUser.emailVerified) {
        console.log('Email not verified, redirecting to verify-email');
        toast({
          title: "Email verification required",
          description: "Please verify your email address to access this page.",
          variant: "destructive",
        });
        router.push('/verify-email');
      } else {
        console.log('User authenticated and email verified');
      }
    }

    return () => clearTimeout(loadingTimeout);
  }, [currentUser, loading, router, toast]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A5C36]"></div>
      </div>
    );
  }

  return currentUser && currentUser.emailVerified ? <>{children}</> : null;
} 