"use client"

import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { useAuth } from './AuthContext'
import OnboardingForm from '@/components/OnboardingForm'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db, functions } from '@/lib/firebase'
import { usePathname } from 'next/navigation'
import { useToast } from '@/components/ui/use-toast'
import { httpsCallable } from 'firebase/functions'

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
  }, [currentUser, loading, pathname]);

  const checkOnboardingStatus = async () => {
    if (!currentUser || isCheckingRef.current) return
    
    isCheckingRef.current = true
    lastCheckedUserIdRef.current = currentUser.uid
    
    try {
      // Add a slight delay to ensure Firestore has the latest data
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const userDocRef = doc(db, 'users', currentUser.uid)
      const userDoc = await getDoc(userDocRef)
      
      if (!userDoc.exists()) {
        // If user document doesn't exist yet, assume onboarding not completed
        setHasCompletedOnboarding(false)
        setShowOnboarding(true)
        return
      }
      
      const userData = userDoc.data()
      
      // Check if onboarding has been completed
      const onboardingCompleted = userData?.onboardingCompleted || false
      
      setHasCompletedOnboarding(onboardingCompleted)
      
      // Only show onboarding modal if onboarding is not completed
      // and we're not on a page that should skip the onboarding check
      if (!onboardingCompleted && !shouldSkip) {
        setShowOnboarding(true)
      } else {
        setShowOnboarding(false)
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
  }

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

      // Update user document to mark onboarding as completed
      const userDocRef = doc(db, 'users', currentUser.uid)
      await updateDoc(userDocRef, {
        firstName: userData.firstName,
        lastName: userData.lastName,
        displayName: `${userData.firstName} ${userData.lastName}`,
        dateOfBirth: userData.dateOfBirth,
        gender: userData.gender || 'unspecified',
        onboardingCompleted: true,
      })

      // Call the Cloud Function to complete onboarding (create family tree, history book, etc.)
      const completeOnboardingFunction = httpsCallable(functions, 'completeOnboarding')
      await completeOnboardingFunction({
        userId: currentUser.uid,
        firstName: userData.firstName,
        lastName: userData.lastName,
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