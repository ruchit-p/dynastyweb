"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { supabaseBrowser } from '@/lib/client/supabase-browser'

export default function VerifyEmailConfirmPage() {
  const [isVerifying, setIsVerifying] = useState(true)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the token from the URL
        const token = searchParams.get('token')
        const type = searchParams.get('type')

        if (!token || type !== 'signup') {
          throw new Error("Invalid verification link. Missing required parameters.")
        }

        // Get the current user after verification
        const { data: { user }, error: userError } = await supabaseBrowser.auth.getUser()
        if (userError) throw userError
        if (!user) throw new Error("User not found")

        // Update the user's profile to remove pending status
        const { error: updateError } = await supabaseBrowser
          .from('users')
          .update({
            is_pending_signup: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) throw updateError

        setIsVerifying(false)
        toast({
          title: "Email verified successfully",
          description: "Your email has been verified. You can now access your family tree.",
        })

        // Redirect to family tree page after a short delay
        setTimeout(() => {
          router.push("/family-tree")
        }, 2000)
      } catch (error) {
        console.error('Verification error:', error)
        setIsVerifying(false)
        setIsError(true)
        const errorMessage = error instanceof Error ? error.message : "Failed to verify email"
        setErrorMessage(errorMessage)
      }
    }

    verifyEmail()
  }, [searchParams, router, toast])

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#0A5C36] mx-auto" />
          <h2 className="mt-6 text-center text-xl font-semibold text-gray-900">
            Verifying your email...
          </h2>
        </div>
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
        {isError ? (
          <>
            <div className="mt-6 flex justify-center">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="mt-4 text-center text-2xl font-semibold text-gray-900">
              Verification Failed
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              {errorMessage}
            </p>
            <div className="mt-6">
              <Button
                onClick={() => router.push("/verify-email")}
                className="w-full"
              >
                Try Again
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <h2 className="mt-4 text-center text-2xl font-semibold text-gray-900">
              Email Verified Successfully
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Redirecting you to your family tree...
            </p>
          </>
        )}
      </div>
    </div>
  )
} 