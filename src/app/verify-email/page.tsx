"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Mail, Loader2, Home } from "lucide-react"
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"
import type { Database } from "@/lib/shared/types/supabase"

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("")
  const [isResending, setIsResending] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  // Check verification status on mount and redirect if verified
  useEffect(() => {
    const checkVerification = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) throw error

        if (!user) {
          // No user found, redirect to login
          router.push('/login')
          return
        }

        if (user.email_confirmed_at) {
          // Email is verified, redirect to family tree
          router.push('/family-tree')
          return
        }

        // Set email for resend functionality
        setEmail(user.email || '')
        setIsLoading(false)
      } catch (error) {
        console.error('Error checking verification:', error)
        router.push('/login')
      }
    }

    checkVerification()
  }, [router, supabase])

  // Listen for auth state changes
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'USER_UPDATED' && session?.user.email_confirmed_at) {
        // Update the user's profile
        const { error: updateError } = await supabase
          .from('users')
          .update({
            is_pending_signup: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', session.user.id)

        if (updateError) {
          console.error('Error updating user profile:', updateError)
        }

        // Redirect to family tree
        router.push('/family-tree')
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  const handleResendEmail = async () => {
    if (!email) return

    setIsResending(true)
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
      })

      if (error) throw error

      toast({
        title: "Verification email sent",
        description: "Please check your inbox for the verification link.",
      })
    } catch (error) {
      console.error("Error resending verification email:", error)
      toast({
        title: "Error",
        description: "Failed to resend verification email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#0A5C36]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Image
          src="/dynasty.png"
          alt="Dynasty Logo"
          width={60}
          height={60}
          className="mx-auto"
        />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Verify your email
        </h2>
        <div className="mt-2 text-center text-sm text-gray-600">
          {email ? (
            <>
              We sent a verification link to <span className="font-medium">{email}</span>
            </>
          ) : (
            "Please verify your email to continue"
          )}
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div className="text-sm text-gray-600 text-center">
              <p>Click the link in the email to verify your account.</p>
              <p className="mt-2">
                Didn&apos;t receive the email? Check your spam folder or click below to resend.
              </p>
            </div>

            <div className="flex flex-col gap-4">
              <Button
                onClick={handleResendEmail}
                disabled={isResending || !email}
                className="w-full"
              >
                {isResending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Resend verification email
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={() => router.push("/")}
                className="w-full"
              >
                <Home className="mr-2 h-4 w-4" />
                Return to home
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 