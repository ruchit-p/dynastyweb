'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useOnboarding } from '@/context/OnboardingContext';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { currentUser, loading } = useAuth();
  const { hasCompletedOnboarding } = useOnboarding();
  const router = useRouter();
  const { toast } = useToast();
  const notificationShown = useRef(false);

  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        router.push('/login');
      } else if (!currentUser.emailVerified && !notificationShown.current) {
        notificationShown.current = true;
        toast({
          title: "Email verification required",
          description: "Please verify your email address to access this page.",
          variant: "destructive",
        });
        router.push('/verify-email');
      }
    }
  }, [currentUser, loading, router, toast]);

  // Show loading spinner while loading
  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0A5C36]"></div>
      </div>
    );
  }

  // Don't render children if user is not authenticated or email is not verified
  if (!currentUser || !currentUser.emailVerified) {
    return null;
  }

  // If we're showing family tree errors and user hasn't completed onboarding,
  // those errors should be suppressed since the family tree document doesn't exist yet
  if (!hasCompletedOnboarding) {
    // We're in onboarding flow, render the children and let onboarding handle it
    return <>{children}</>;
  }

  return <>{children}</>;
} 