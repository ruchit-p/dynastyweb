"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Mail, Loader2, Home } from "lucide-react"
import { useAuth } from "@/lib/client/hooks/useAuth"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/shared/types/supabase"

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("")
  const [isResending, setIsResending] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  // Effect for initial auth state and email setup
  useEffect(() => {
    // Only take action after the auth state has loaded
    if (!loading) {
      if (user?.email_confirmed_at) {
        router.push("/family-tree")
      } else if (user?.email) {
        setEmail(user.email)
      } else if (!user) {
        // Only redirect to login if we're sure there's no user
        toast({
          title: "Session expired",
          description: "Please sign in again to verify your email.",
          variant: "destructive",
        })
        router.push("/login")
      }
    }
  }, [user, loading, router, toast])

  // Handle resend verification email
  const handleResendVerification = async () => {
    try {
      setIsResending(true)
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })
      
      if (error) throw error

      toast({
        title: "Verification email sent",
        description: "Please check your email for the verification link.",
      })
    } catch (error) {
      console.error('Error resending verification:', error)
      toast({
        title: "Error",
        description: "Failed to resend verification email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="container flex flex-col items-center justify-center min-h-screen py-12 space-y-8">
      <div className="flex flex-col items-center space-y-4 text-center">
        <div className="relative w-24 h-24">
          <Image
            src="/logo.png"
            alt="Logo"
            fill
            className="object-contain"
            priority
          />
        </div>
        <h1 className="text-3xl font-bold">Check your email</h1>
        <p className="max-w-sm text-muted-foreground">
          We sent a verification link to {email}. Click the link to verify your email address.
        </p>
      </div>

      <div className="flex flex-col items-center space-y-4">
        <Button
          variant="outline"
          onClick={handleResendVerification}
          disabled={isResending || !email}
          className="w-full"
        >
          {isResending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Mail className="w-4 h-4 mr-2" />
              Resend verification email
            </>
          )}
        </Button>
        <Button
          variant="ghost"
          onClick={() => router.push("/")}
          className="w-full"
        >
          <Home className="w-4 h-4 mr-2" />
          Return to home
        </Button>
      </div>
    </div>
  )
} 