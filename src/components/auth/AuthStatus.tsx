'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/client/supabase-browser';
import { Button } from '@/components/ui/button';
import { signOut } from '@/app/actions/auth';
import { toast } from '@/components/ui/use-toast';
import { User } from '@supabase/supabase-js';

interface AuthStatusProps {
  className?: string;
  showSignOut?: boolean;
  showEmail?: boolean;
  hideWhenNotAuthenticated?: boolean;
}

/**
 * A component that displays authentication status and sign-out button
 * Can be used in headers, navigation bars, or user menus
 */
export default function AuthStatus({
  className = '',
  showSignOut = true,
  showEmail = true,
  hideWhenNotAuthenticated = false
}: AuthStatusProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        
        setUser(session?.user || null);
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Set up auth state listener
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user || null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      const result = await signOut();
      
      if (result.error) {
        toast({
          title: "Error signing out",
          description: result.error.message,
          variant: "destructive"
        });
      } else {
        // Router redirect handled by auth state change listener
        toast({
          title: "Signed out successfully",
          variant: "default"
        });
      }
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: "Error signing out",
        description: "An unexpected error occurred",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return <div className={`text-sm opacity-70 ${className}`}>Loading...</div>;
  }

  if (!user && hideWhenNotAuthenticated) {
    return null;
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {user ? (
        <>
          {showEmail && user.email && (
            <span className="text-sm font-medium">
              {user.email}
            </span>
          )}
          {showSignOut && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleSignOut}
              className="h-8 px-2"
            >
              Sign out
            </Button>
          )}
        </>
      ) : (
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => router.push('/login')}
          className="h-8 px-2"
        >
          Sign in
        </Button>
      )}
    </div>
  );
} 