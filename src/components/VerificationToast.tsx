import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import { Mail } from 'lucide-react'

export function showVerificationToast() {
  return toast({
    title: 'Email Verification Required',
    description: 'Please check your email and verify your account to continue.',
    variant: 'destructive',
    duration: Infinity, // Make it persistent
    action: (
      <div className="flex flex-col gap-2 mt-2">
        <Button
          variant="outline"
          size="sm"
          className="bg-white text-black hover:bg-gray-100"
          onClick={() => {
            window.location.href = '/verify-email'
          }}
        >
          <Mail className="mr-2 h-4 w-4" />
          Go to Verification Page
        </Button>
      </div>
    ),
  })
}

export function useVerificationToast(isEmailVerified: boolean) {
  const router = useRouter()

  useEffect(() => {
    if (!isEmailVerified) {
      showVerificationToast()
    }
  }, [isEmailVerified])

  return null
} 