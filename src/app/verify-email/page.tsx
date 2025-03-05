"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Mail, Loader2, Home } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("")
  const [isResending, setIsResending] = useState(false)
  const { currentUser, loading, sendVerificationEmail } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const verificationNotified = useRef(false)
  const hasRedirected = useRef(false)

  useEffect(() => {
    if (!loading) {
      if (currentUser?.emailVerified && !hasRedirected.current) {
        hasRedirected.current = true
        router.push("/family-tree")
      } else if (currentUser?.email) {
        setEmail(currentUser.email)
      } else if (!currentUser) {
        toast({
          title: "Session expired",
          description: "Please sign in again to verify your email.",
          variant: "destructive",
        })
        router.push("/login")
      }
    }
  }, [currentUser, loading, router, toast])

  useEffect(() => {
    if (!currentUser || loading || verificationNotified.current || hasRedirected.current) return
    
    const checkVerification = async () => {
      try {
        await auth.currentUser?.reload()
        const freshUser = auth.currentUser
        
        if (freshUser?.emailVerified && !verificationNotified.current) {
          verificationNotified.current = true
          toast({
            title: "Email verified!",
            description: "Your email has been verified. Redirecting to your family tree...",
          })
          
          hasRedirected.current = true
          router.push("/family-tree")
        }
      } catch (error) {
        console.error("Error checking verification status:", error)
      }
    }
    
    checkVerification()
    
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.emailVerified && !verificationNotified.current) {
        verificationNotified.current = true
        toast({
          title: "Email verified!",
          description: "Your email has been verified. Redirecting to your family tree...",
        })
        
        hasRedirected.current = true
        router.push("/family-tree")
      }
    })
    
    return () => unsubscribe()
  }, [currentUser, loading, router, toast])

  const handleResendVerification = async () => {
    setIsResending(true)
    try {
      await sendVerificationEmail()
      toast({
        title: "Verification email sent",
        description: "Please check your inbox and follow the link to verify your email. The link will expire in 30 minutes.",
      })
    } catch (err) {
      console.error("Failed to send verification email:", err)
      toast({
        title: "Error",
        description: "Failed to send verification email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative">
        <div className="flex justify-center">
          <div className="relative w-20 h-20">
            <Image
              src="/dynasty.png"
              alt="Dynasty Logo"
              width={80}
              height={80}
              className="mx-auto"
            />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-bold text-[#0A5C36]">
          Verify Your Email
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 max-w-sm mx-auto">
          We&apos;ve sent a verification email to your inbox. Please verify your email to continue.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-lg sm:rounded-xl sm:px-10 border border-gray-100">
          <div className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-gray-700">Email address</Label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!!currentUser?.email}
                  className="rounded-md border-gray-300 focus:border-[#0A5C36] focus:ring-[#0A5C36]/20"
                />
              </div>
            </div>

            <div>
              <Button
                onClick={handleResendVerification}
                className="w-full flex justify-center items-center bg-[#0A5C36] hover:bg-[#0A5C36]/90 text-white"
                disabled={isResending}
              >
                {isResending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                {isResending ? "Sending..." : "Resend verification email"}
              </Button>
              <p className="mt-2 text-xs text-center text-gray-500">
                A new verification link will be sent to your email. The link will be valid for 30 minutes.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Need help?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Check your spam folder or contact{" "}
                <a href="mailto:support@mydynastyapp.com" className="font-medium text-[#0A5C36] hover:text-[#0A5C36]/80 transition-colors">
                  support@mydynastyapp.com
                </a>
              </p>
            </div>

            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full flex justify-center items-center border-[#C4A55C] text-[#C4A55C] hover:bg-[#C4A55C]/10 hover:text-[#C4A55C] hover:border-[#C4A55C]"
                onClick={() => router.push("/")}
              >
                <Home className="mr-2 h-4 w-4" />
                Return to Dynasty Home
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 