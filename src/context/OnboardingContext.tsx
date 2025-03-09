"use client"

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from './AuthContext'
import OnboardingForm from '@/components/OnboardingForm'
import { functions } from '@/lib/firebase'
import { usePathname } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { httpsCallable } from 'firebase/functions'

type PrefillData = {
  firstName?: string
  lastName?: string
  dateOfBirth?: Date | null
  gender?: string
  phoneNumber?: string
}

type OnboardingContextType = {
  showOnboarding: boolean
  completeOnboarding: (userData: {
    firstName: string
    lastName: string
    dateOfBirth: Date | undefined
    gender?: 'male' | 'female' | 'other' | 'unspecified'
  }) => Promise<void>
  hasCompletedOnboarding: boolean
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(true)
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null)
  const { currentUser, loading } = useAuth()
  const isCheckingRef = useRef(false)
  const lastCheckedUserIdRef = useRef<string | null>(null)
  const pathname = usePathname()
  const { toast } = useToast()
  
  // Skip onboarding paths
  const skipPaths = ['/login', '/signup', '/verify-email', '/reset-password']
  const shouldSkip = skipPaths.some(path => pathname?.startsWith(path))
  
  // Add public pages that don't require onboarding
  const publicPaths = ['/']
  const isPublicPage = publicPaths.some(path => pathname === path)

  const checkOnboardingStatus = useCallback(async () => {
    if (!currentUser || isCheckingRef.current) return
    
    isCheckingRef.current = true
    lastCheckedUserIdRef.current = currentUser.uid
    
    try {
      // Add a slight delay to ensure data is ready
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Use Cloud Function to get user data instead of direct Firestore access
      const getUserData = httpsCallable<{ userId: string }, { 
        userData: {
          onboardingCompleted: boolean;
          firstName?: string;
          lastName?: string;
          dateOfBirth?: string | null;
          gender?: string;
          phoneNumber?: string;
        };
        success: boolean;
        message?: string;
      }>(functions, 'getUserData');
      
      const { data } = await getUserData({ userId: currentUser.uid });
      
      if (!data.success) {
        // If we get a 'not found' message, it means the user doesn't exist yet
        if (data.message === "User not found") {
          setHasCompletedOnboarding(false);
          setShowOnboarding(true);
          return;
        }
        
        throw new Error(data.message || 'Failed to fetch user data');
      }
      
      const userData = data.userData;
      
      if (!userData) {
        // If user document doesn't exist yet, assume onboarding not completed
        setHasCompletedOnboarding(false);
        setShowOnboarding(true);
        return;
      }
      
      // Check if onboarding has been completed
      const onboardingCompleted = userData.onboardingCompleted || false;
      
      setHasCompletedOnboarding(onboardingCompleted);
      
      // Extract prefill data from user document
      if (!onboardingCompleted) {
        const dateOfBirth = userData.dateOfBirth;
        let parsedDate = null;
        
        if (dateOfBirth) {
          // Parse the date from the response
          parsedDate = new Date(dateOfBirth);
        }
        
        setPrefillData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          dateOfBirth: parsedDate,
          gender: userData.gender || 'unspecified',
          phoneNumber: userData.phoneNumber || ''
        });
      }
      
      // Only show onboarding modal if onboarding is not completed
      // and we're not on a page that should skip the onboarding check
      if (!onboardingCompleted && !shouldSkip) {
        setShowOnboarding(true);
      } else {
        setShowOnboarding(false);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error)
      
      // Don't show the error toast for family tree if we're in onboarding
      // Only show generic error message about checking onboarding status
      if (!hasCompletedOnboarding) {
        toast({
          title: "Error",
          description: "There was an error checking your onboarding status. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      isCheckingRef.current = false
    }
  }, [currentUser, hasCompletedOnboarding, shouldSkip, toast]);

  useEffect(() => {
    // Only check onboarding status if:
    // 1. User is authenticated and email is verified
    // 2. We're not already checking
    // 3. We're not on a skip path or public page
    // 4. We haven't checked this user already or we need to re-check
    if (
      currentUser && 
      currentUser.emailVerified && 
      !isCheckingRef.current && 
      !shouldSkip && 
      !isPublicPage &&
      lastCheckedUserIdRef.current !== currentUser.uid
    ) {
      checkOnboardingStatus();
    }
  }, [currentUser, loading, pathname, checkOnboardingStatus, shouldSkip, isPublicPage]);

  const handleOnboardingComplete = async (userData: {
    firstName: string
    lastName: string
    dateOfBirth: Date | undefined
    gender?: 'male' | 'female' | 'other' | 'unspecified'
  }) => {
    try {
      if (!currentUser) {
        throw new Error('User not authenticated')
      }

      // Call the Cloud Function to complete onboarding
      // This will handle all database operations in one call
      const completeOnboardingFunction = httpsCallable(functions, 'completeOnboarding')
      await completeOnboardingFunction({
        userId: currentUser.uid,
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: `${userData.firstName} ${userData.lastName}`,
        dateOfBirth: userData.dateOfBirth,
        gender: userData.gender || 'unspecified',
      })

      // Update local state
      setHasCompletedOnboarding(true)
      setShowOnboarding(false)

      toast({
        title: "Onboarding completed!",
        description: "Your profile has been set up successfully.",
      })
    } catch (error) {
      console.error('Error completing onboarding:', error)
      toast({
        title: "Error",
        description: "There was an error completing your onboarding. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <OnboardingContext.Provider value={{ 
      showOnboarding, 
      completeOnboarding: handleOnboardingComplete,
      hasCompletedOnboarding
    }}>
      {children}
      {currentUser && showOnboarding && (
        <OnboardingForm
          isOpen={showOnboarding}
          onComplete={handleOnboardingComplete}
          userEmail={currentUser.email || undefined}
          prefillData={prefillData}
        />
      )}
    </OnboardingContext.Provider>
  )
}

export const useOnboarding = () => {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
} 