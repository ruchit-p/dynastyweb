"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function AccountSettingsPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to personal information page by default
    router.replace("/account-settings/personal-information")
  }, [router])

  // Return null since we're redirecting
  return null
} 