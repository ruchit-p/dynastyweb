"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { useOnboarding } from "@/context/OnboardingContext"
import { Loader2 } from "lucide-react"

/**
 * This page serves as a temporary stopping point for new Google users
 * to ensure the onboarding form is shown before redirecting to family-tree.
 * It forces the OnboardingContext to check the user's onboarding status.
 */
export default function OnboardingRedirectPage() {
  const router = useRouter()
  const { currentUser, loading } = useAuth()
  const { hasCompletedOnboarding, showOnboarding } = useOnboarding()

  useEffect(() => {
    // Only proceed if we're not loading
    if (!loading) {
      // If user is not logged in, redirect to login
      if (!currentUser) {
        router.push("/login")
        return
      }

      // If user has not verified email (unlikely for Google users), redirect to verify email
      if (!currentUser.emailVerified) {
        router.push("/verify-email")
        return
      }

      // If user has completed onboarding or if onboarding is showing, redirect to family tree
      // Onboarding will be shown by the OnboardingContext's modal
      if (hasCompletedOnboarding || showOnboarding) {
        router.push("/family-tree")
      }
      // Otherwise, we stay on this page while OnboardingContext initializes
    }
  }, [currentUser, loading, router, hasCompletedOnboarding, showOnboarding])

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-[#0A5C36]" />
        <h2 className="mt-6 text-xl font-semibold text-gray-900">
          Setting up your account...
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Please wait while we prepare your Dynasty experience.
        </p>
      </div>
    </div>
  )
} 