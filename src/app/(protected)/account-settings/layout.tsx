"use client"

import type React from "react"
import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { User, Bell, Lock, HelpCircle, LogOut, ChevronRight } from "lucide-react"
import { useAuth } from "@/components/auth"
import { useToast } from "@/components/ui/use-toast"
import ProtectedRoute from "@/components/ProtectedRoute"

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

export default function AccountSettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { logout } = useAuth()
  const { toast } = useToast()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row mt-6 md:space-x-8">
          <main className="flex-1 bg-white shadow-xl rounded-xl p-6">{children}</main>

          <aside className="md:w-64 mb-8 md:mb-0 ">
            <nav className="space-y-1">
              {sidebarNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
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