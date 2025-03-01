"use client"

import { useState, useEffect } from "react"
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

  // Effect for initial auth state and email setup
  useEffect(() => {
    // Only take action after the auth state has loaded
    if (!loading) {
      if (currentUser?.emailVerified) {
        router.push("/family-tree")
      } else if (currentUser?.email) {
        setEmail(currentUser.email)
      } else if (!currentUser) {
        // Only redirect to login if we're sure there's no user
        toast({
          title: "Session expired",
          description: "Please sign in again to verify your email.",
          variant: "destructive",
        })
        router.push("/login")
      }
    }
  }, [currentUser, loading, router, toast])

  // Add this effect to immediately check verification status when the page loads
  useEffect(() => {
    const checkVerificationImmediately = async () => {
      if (!currentUser) return;
      
      try {
        // Force an immediate token refresh when the page loads
        await auth.currentUser?.reload();
        const freshUser = auth.currentUser;
        
        if (freshUser?.emailVerified) {
          toast({
            title: "Email verified!",
            description: "Your email has been verified. Redirecting to your family tree...",
          });
          router.push("/family-tree");
        }
      } catch (error) {
        console.error("Error checking verification status:", error);
      }
    };
    
    // Run the check immediately when component mounts or user changes
    checkVerificationImmediately();
  }, [currentUser, router, toast]);

  // Real-time listener for email verification status
  useEffect(() => {
    if (!currentUser) return

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user?.emailVerified) {
        toast({
          title: "Email verified!",
          description: "Your email has been verified. Redirecting to your family tree...",
        })
        // Redirect immediately
        router.push("/family-tree")
      }
    })

    return () => unsubscribe()
  }, [currentUser, router, toast])

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
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <Image
            src="/dynasty.png"
            alt="Dynasty Logo"
            width={60}
            height={60}
            className="mx-auto"
          />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Verify your email</h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          We&apos;ve sent a verification email to your inbox. Please verify your email to continue.
          The verification link will expire in 30 minutes.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="space-y-6">
            <div>
              <Label htmlFor="email">Email address</Label>
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
                />
              </div>
            </div>

            <div>
              <Button
                onClick={handleResendVerification}
                className="w-full flex justify-center items-center"
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
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Need help?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                Check your spam folder or contact{" "}
                <a href="mailto:support@mydynastyapp.com" className="font-medium text-[#0A5C36] hover:text-[#0A5C36]/80">
                  support@mydynastyapp.com
                </a>
              </p>
            </div>

            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full flex justify-center items-center"
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