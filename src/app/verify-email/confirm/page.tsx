"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, CheckCircle2, XCircle } from "lucide-react"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/shared/types/supabase'

export default function VerifyEmailConfirmPage() {
  const [isVerifying, setIsVerifying] = useState(true)
  const [isError, setIsError] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        const token = searchParams.get("token")

        if (!token) {
          throw new Error("Invalid verification link. Missing required parameters.")
        }

        const { error } = await supabase.auth.verifyOtp({
          token_hash: token,
          type: 'email'
        })

        if (error) throw error

        setIsVerifying(false)
        toast({
          title: "Email verified successfully",
          description: "Your email has been verified. Redirecting to your family tree.",
        })

        // Redirect immediately instead of using setTimeout
        router.push("/family-tree")
      } catch (error) {
        setIsVerifying(false)
        setIsError(true)
        const errorMessage = error instanceof Error ? error.message : "Failed to verify email"
        setErrorMessage(errorMessage)
      }
    }

    verifyEmail()
  }, [searchParams, router, toast, supabase])

  const handleResendVerification = async () => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: searchParams.get("email") || '',
      })

      if (error) throw error

      toast({
        title: "New verification email sent",
        description: "Please check your inbox for the new verification link. The link will expire in 30 minutes.",
      })
    } catch (err) {
      console.error("Failed to send new verification email:", err)
      toast({
        title: "Error",
        description: "Failed to send new verification email. Please try again.",
        variant: "destructive",
      })
    }
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
        {isVerifying ? (
          <>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Verifying your email</h2>
            <div className="mt-8 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#0A5C36]" />
            </div>
          </>
        ) : isError ? (
          <>
            <div className="mt-6 flex justify-center">
              <XCircle className="h-12 w-12 text-red-500" />
            </div>
            <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">Verification failed</h2>
            <p className="mt-2 text-center text-sm text-gray-600">{errorMessage}</p>
            <div className="mt-6">
              <Button
                onClick={handleResendVerification}
                className="w-full flex justify-center items-center"
              >
                Send new verification email
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="mt-6 flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-[#0A5C36]" />
            </div>
            <h2 className="mt-4 text-center text-3xl font-extrabold text-gray-900">Email verified</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Your email has been verified successfully. Redirecting you to your family tree...
            </p>
          </>
        )}
      </div>
    </div>
  )
} 