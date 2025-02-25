'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import Link from 'next/link'

export default function VerificationErrorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string>('')
  
  useEffect(() => {
    // Get error message from URL params
    const errorMessage = searchParams.get('error')
    setError(errorMessage || 'An unknown error occurred during verification')
  }, [searchParams])
  
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
        
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <AlertTriangle className="h-12 w-12 text-amber-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Verification Failed
          </h1>
          
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          
          <p className="text-gray-600">
            We couldn&apos;t verify your email address. This might be because:
          </p>
          
          <ul className="text-left text-gray-600 list-disc pl-5 space-y-1">
            <li>The verification link has expired</li>
            <li>The link was already used</li>
            <li>There was a technical issue</li>
          </ul>
          
          <div className="pt-4 space-y-4">
            <Button 
              className="w-full bg-[#0A5C36] hover:bg-[#0A5C36]/90"
              onClick={() => router.push('/login')}
            >
              Return to Login
            </Button>
            
            <p className="text-sm text-gray-500">
              Need help? <Link href="/support" className="text-[#0A5C36] hover:underline">Contact support</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 