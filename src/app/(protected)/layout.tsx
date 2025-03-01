"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Navbar from "@/components/Navbar"
import { Toaster } from "@/components/ui/toaster"
import { authService } from '@/lib/client/services/auth'
import { api } from '@/lib/api-client'

// Define a proper user type instead of using 'any'
interface User {
  id: string
  email?: string | null
  display_name?: string | null
  first_name?: string | null
  last_name?: string | null
  profile_picture?: string | null
  email_confirmed_at?: string | null
}

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    async function checkAuth() {
      try {
        // First check if we have a valid session
        const { session, error } = await authService.getSession()
        
        if (!session || error) {
          router.push('/login')
          return
        }
        
        // Get user profile through the edge function API
        const userResponse = await api.auth.getUser()
        
        if (userResponse.error) {
          console.error('Failed to fetch user data:', userResponse.error)
          router.push('/login')
          return
        }
        
        // Type assertion to ensure we're setting the right type
        const userData = userResponse.data as User;
        setUser(userData)
        setIsLoading(false)
      } catch (error) {
        console.error('Authentication error:', error)
        router.push('/login')
      }
    }
    
    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#0A5C36]"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-16">
      <Navbar user={user as User} />
      {children}
      <Toaster />
    </div>
  )
} 