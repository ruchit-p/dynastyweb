"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { User, Bell, Lock, HelpCircle, LogOut } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import ProtectedRoute from "@/components/ProtectedRoute"
import { testFirebaseConnection } from "@/lib/firebase-debug"

interface SidebarNavItem {
  title: string
  href: string
  icon: React.ReactNode
  description: string
}

const sidebarNavItems: SidebarNavItem[] = [
  {
    title: "Personal Information",
    href: "/account-settings/personal-information",
    icon: <User className="w-4 h-4" />,
    description: "Manage your profile details",
  },
  {
    title: "Notifications",
    href: "/account-settings/notifications",
    icon: <Bell className="w-4 h-4" />,
    description: "Control your notification preferences",
  },
  {
    title: "Privacy & Security",
    href: "/account-settings/privacy-security",
    icon: <Lock className="w-4 h-4" />,
    description: "Manage your account's privacy and security",
  },
  {
    title: "Help & Support",
    href: "/account-settings/help-support",
    icon: <HelpCircle className="w-4 h-4" />,
    description: "Get assistance and view FAQs",
  },
]

// Component that prefetches all account settings routes
function PrefetchAccountRoutes() {
  const router = useRouter()

  useEffect(() => {
    // Prefetch all account setting routes
    sidebarNavItems.forEach(item => {
      router.prefetch(item.href)
    })
  }, [router])

  // This is a utility component that doesn't render anything
  return null
}

export default function AccountSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [firebaseStatus, setFirebaseStatus] = useState<{auth: boolean, firestore: boolean, error: string | null} | null>(null)
  const { signOut } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()

  // Test Firebase connection on component mount
  useEffect(() => {
    async function checkFirebase() {
      const status = await testFirebaseConnection()
      setFirebaseStatus(status)
      
      if (status.error) {
        console.error('Firebase connection issue detected:', status.error)
        toast({
          title: "Connection Issue",
          description: "There was an issue connecting to the database. This may affect loading your settings.",
          variant: "destructive",
        })
      }
    }
    
    checkFirebase()
  }, [toast])

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await signOut()
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      })
      router.push("/login")
    } catch (err) {
      toast({
        title: "Error logging out",
        description: err instanceof Error ? err.message : "There was a problem logging out. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <ProtectedRoute>
      {/* Include the prefetching component */}
      <PrefetchAccountRoutes />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mt-6 mb-4">Account Settings</h1>
        
        {/* Horizontal Navigation Bar */}
        <div className="mb-6">
          <nav className="flex flex-wrap gap-2 p-1 bg-background border rounded-lg shadow-sm overflow-x-auto">
            {sidebarNavItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-all whitespace-nowrap",
                  pathname === item.href 
                    ? "bg-[#0A5C36] text-white" 
                    : "hover:bg-accent"
                )}
              >
                <div className="flex items-center justify-center">
                  {item.icon}
                </div>
                <span>{item.title}</span>
              </Link>
            ))}
            <Button 
              variant="destructive" 
              size="sm" 
              className="ml-auto whitespace-nowrap" 
              onClick={handleLogout} 
              disabled={isLoggingOut}
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? "Logging out..." : "Log Out"}
            </Button>
          </nav>
        </div>

        <main className="rounded-xl">
          {firebaseStatus && firebaseStatus.error && (
            <div className="mb-4 p-2 bg-red-50 text-red-700 rounded text-sm">
              Firebase connection issue detected. Please refresh the page or try again later.
            </div>
          )}
          {children}
        </main>
      </div>
    </ProtectedRoute>
  )
} 