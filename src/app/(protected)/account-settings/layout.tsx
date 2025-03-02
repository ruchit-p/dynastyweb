"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { User, Bell, Lock, HelpCircle, LogOut, ChevronRight } from "lucide-react"
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
        <div className="flex flex-col md:flex-row mt-6 md:space-x-8">
          <main className="flex-1 mb-6 rounded-xl">
            {firebaseStatus && firebaseStatus.error && (
              <div className="mb-4 p-2 bg-red-50 text-red-700 rounded text-sm">
                Firebase connection issue detected. Please refresh the page or try again later.
              </div>
            )}
            {children}
          </main>

          <aside className="md:w-64 mb-8 md:mb-0 ">
            <nav className="space-y-1">
              {sidebarNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all hover:bg-accent",
                    pathname === item.href ? "bg-accent" : "transparent",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg border",
                      pathname === item.href ? "border-[#0A5C36] bg-[#0A5C36] text-white" : "border-border",
                    )}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium leading-none">{item.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </nav>
            <div className="mt-4">
              <Button variant="destructive" className="w-full" onClick={handleLogout} disabled={isLoggingOut}>
                <LogOut className="mr-2 h-4 w-4" />
                {isLoggingOut ? "Logging out..." : "Log Out"}
              </Button>
            </div>
          </aside>
        </div>
      </div>
    </ProtectedRoute>
  )
} 