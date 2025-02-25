"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"
import { Mail, CheckCircle, Clock, RefreshCw, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { createClient } from "@/lib/supabase"
import { authService, type AuthError } from "@/lib/client/services/auth-service"

const VERIFICATION_EXPIRY_TIME = 24 * 60 * 60 * 1000 // 24 hours in milliseconds
const RESEND_COOLDOWN = 60 // Cooldown period in seconds

export default function VerifyEmailPage() {
  const router = useRouter()
  const [isVerified, setIsVerified] = useState<boolean>(false)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isResending, setIsResending] = useState<boolean>(false)
  const [email, setEmail] = useState<string>("")
  const [resendCooldown, setResendCooldown] = useState<number>(0)
  const [expiryTime, setExpiryTime] = useState<number | null>(null)
  const [expiryPercent, setExpiryPercent] = useState<number>(100)
  const [error, setError] = useState<string>("")

  // Check if user is verified on mount
  useEffect(() => {
    const checkVerification = async () => {
      try {
        setIsLoading(true)
        const supabase = createClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
          console.error('Auth error:', error)
          router.push('/login')
          return
        }

        if (!user) {
          router.push('/login')
          return
        }

        // Set email for display
        setEmail(user.email || "")

        // Check verification status
        if (user.email_confirmed_at) {
          setIsVerified(true)
          // Redirect to main app after 3 seconds
          setTimeout(() => {
            router.push('/family-tree')
          }, 3000)
          return
        }

        // Calculate expiry time based on creation time
        // Supabase gives us user.created_at as a string, so we need to parse it
        const userCreatedAt = new Date(user.created_at).getTime()
        const expiryTimeValue = userCreatedAt + VERIFICATION_EXPIRY_TIME
        setExpiryTime(expiryTimeValue)

        // Set up timer to check verification status regularly
        const verificationCheckTimer = setInterval(async () => {
          const { data: { user: refreshedUser } } = await supabase.auth.getUser()
          if (refreshedUser?.email_confirmed_at) {
            setIsVerified(true)
            clearInterval(verificationCheckTimer)
            clearInterval(expiryTimer)
            setTimeout(() => {
              router.push('/family-tree')
            }, 3000)
          }
        }, 5000)

        // Set up timer to update expiry progress
        const expiryTimer = setInterval(() => {
          if (expiryTimeValue) {
            const now = Date.now()
            const timeLeft = expiryTimeValue - now
            
            if (timeLeft <= 0) {
              clearInterval(expiryTimer)
              setExpiryPercent(0)
              setError('Your verification link has expired. Please request a new one.')
              return
            }
            
            const percentLeft = (timeLeft / VERIFICATION_EXPIRY_TIME) * 100
            setExpiryPercent(Math.max(0, Math.min(100, percentLeft)))
          }
        }, 1000)

        // Clean up timers on unmount
        return () => {
          clearInterval(verificationCheckTimer)
          clearInterval(expiryTimer)
        }
      } catch (err) {
        console.error('Error checking verification:', err)
        setError('An error occurred while checking verification status')
      } finally {
        setIsLoading(false)
      }
    }

    checkVerification()
  }, [router])

  // Set up resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    
    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1))
    }, 1000)
    
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleResendVerification = async () => {
    if (resendCooldown > 0 || !email) return
    
    try {
      setIsResending(true)
      
      // Use auth service to resend verification email
      const result = await authService.sendEmailVerification({
        email,
        expiresIn: VERIFICATION_EXPIRY_TIME / 1000 // Convert ms to seconds
      })
      
      if (!result.success) {
        // Type guard to check if result has an error property
        if ('error' in result) {
          throw new Error(result.error.message || 'Failed to resend verification email')
        } else {
          throw new Error('Failed to resend verification email')
        }
      }
      
      // Reset expiry time to now + 24 hours
      const newExpiryTime = Date.now() + VERIFICATION_EXPIRY_TIME
      setExpiryTime(newExpiryTime)
      setExpiryPercent(100)
      setError('')
      
      // Start cooldown
      setResendCooldown(RESEND_COOLDOWN)
      
      toast({
        title: 'Verification email sent',
        description: 'Please check your inbox and spam folder',
        variant: 'default'
      })
    } catch (err) {
      console.error('Error resending verification:', err)
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to resend verification email',
        variant: 'destructive'
      })
    } finally {
      setIsResending(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md p-8 space-y-4 bg-white rounded-lg shadow-md text-center">
          <div className="flex justify-center">
            <RefreshCw className="h-12 w-12 text-[#0A5C36] animate-spin" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Loading...
          </h1>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-center">
          <Image
            src="/dynasty.png"
            alt="Dynasty Logo"
            width={60}
            height={60}
          />
        </div>
        
        {isVerified ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">
              Email Verified!
            </h1>
            <p className="text-gray-600">
              Your email has been successfully verified. Redirecting you to the app...
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <Mail className="h-12 w-12 text-[#0A5C36]" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">
                Verify Your Email
              </h1>
              <p className="text-gray-600">
                We&apos;ve sent a verification email to <span className="font-medium">{email}</span>. 
                Please check your inbox and click the link to verify your account.
              </p>
            </div>
            
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Clock className="h-4 w-4 mr-1 text-amber-500" />
                  <span className="text-sm text-gray-600">Verification link expires in:</span>
                </div>
                <span className="text-sm font-medium">
                  {expiryTime && (
                    <ExpiryCountdown expiryTime={expiryTime} onExpire={() => {
                      setError('Your verification link has expired. Please request a new one.')
                      setExpiryPercent(0)
                    }} />
                  )}
                </span>
              </div>
              <Progress value={expiryPercent} className="h-2" />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                Didn&apos;t receive the email? Check your spam folder or request a new verification link.
              </p>
              <Button 
                onClick={handleResendVerification}
                disabled={resendCooldown > 0 || isResending}
                className="w-full"
              >
                {resendCooldown > 0 
                  ? `Resend in ${resendCooldown}s` 
                  : isResending 
                    ? 'Sending...' 
                    : 'Resend Verification Email'
                }
              </Button>
            </div>
            
            <div className="text-center">
              <Button
                variant="link"
                onClick={() => router.push('/login')}
                className="text-sm font-medium text-[#0A5C36]"
              >
                Return to login
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper component to display countdown
function ExpiryCountdown({ expiryTime, onExpire }: { expiryTime: number, onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState<string>("")
  
  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = Date.now()
      const difference = expiryTime - now
      
      if (difference <= 0) {
        setTimeLeft("Expired")
        onExpire()
        return
      }
      
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24)
      const minutes = Math.floor((difference / 1000 / 60) % 60)
      const seconds = Math.floor((difference / 1000) % 60)
      
      setTimeLeft(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`)
    }
    
    calculateTimeLeft()
    const timer = setInterval(calculateTimeLeft, 1000)
    
    return () => clearInterval(timer)
  }, [expiryTime, onExpire])
  
  return <span>{timeLeft}</span>
} 