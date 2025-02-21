"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { User, Bell, Lock, PaintbrushIcon as PaintBrush, HelpCircle, LogOut, ChevronRight } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function AccountSettingsPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const { logout } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true)
      await logout()
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      })
      router.push("/login") // Redirect to login page
    } catch (error) {
      toast({
        title: "Error logging out",
        description: "There was a problem logging out. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4 max-w-3xl">
        <h1 className="text-3xl font-bold my-6 text-[#000000]">Account Settings</h1>

        <div className="bg-white shadow-xl rounded-xl overflow-hidden">
          <SettingsItem
            icon={<User className="h-5 w-5" />}
            title="Personal Information"
            description="Manage your profile details"
            href="/account-settings/personal-information"
          />
          <SettingsItem
            icon={<Bell className="h-5 w-5" />}
            title="Notifications"
            description="Control your notification preferences"
            href="/account-settings/notifications"
          />
          <SettingsItem
            icon={<Lock className="h-5 w-5" />}
            title="Privacy & Security"
            description="Manage your account's privacy and security"
            href="/account-settings/privacy-security"
          />
          <SettingsItem
            icon={<PaintBrush className="h-5 w-5" />}
            title="Appearance"
            description="Customize your app's look and feel"
            href="/account-settings/appearance"
          />
          <SettingsItem
            icon={<HelpCircle className="h-5 w-5" />}
            title="Help & Support"
            description="Get assistance and view FAQs"
            href="/account-settings/help-support"
            noBorder
          />
        </div>

        <div className="mt-8">
          <Button
            variant="destructive"
            className="w-full bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg transition duration-200"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            <LogOut className="mr-2 h-5 w-5" />
            {isLoggingOut ? "Logging out..." : "Log Out"}
          </Button>
        </div>
      </div>
    </ProtectedRoute>
  )
}

function SettingsItem({
  icon,
  title,
  description,
  href,
  noBorder = false,
}: {
  icon: React.ReactNode
  title: string
  description: string
  href: string
  noBorder?: boolean
}) {
  return (
    <Link href={href} className="block">
      <div
        className={`flex items-center justify-between p-4 hover:bg-gray-50 transition duration-150 ease-in-out ${!noBorder ? "border-b border-gray-200" : ""}`}
      >
        <div className="flex items-center">
          <div className="text-[#0A5C36] mr-4">{icon}</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </div>
        </div>
        <ChevronRight className="text-gray-400 h-5 w-5" />
      </div>
    </Link>
  )
} 