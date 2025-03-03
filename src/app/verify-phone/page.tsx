"use client"

import { useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"

const verificationSchema = z.object({
  code: z.string().min(6, "Verification code must be at least 6 characters").max(6, "Verification code must not exceed 6 characters"),
})

type VerificationFormValues = z.infer<typeof verificationSchema>

export default function VerifyPhonePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const { confirmPhoneAuth } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const phoneNumber = searchParams.get("phone") || ""
  
  const form = useForm<VerificationFormValues>({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      code: "",
    },
  })

  useEffect(() => {
    // Check if we have a verification ID in session storage
    const verificationId = sessionStorage.getItem("phoneAuthVerificationId")
    if (!verificationId || !phoneNumber) {
      toast({
        title: "Error",
        description: "Missing verification information. Please try signing in again.",
        variant: "destructive",
      })
      router.push("/auth")
    }
  }, [phoneNumber, router, toast])

  const onSubmit = async (data: VerificationFormValues) => {
    setIsLoading(true)
    try {
      const verificationId = sessionStorage.getItem("phoneAuthVerificationId")
      if (!verificationId) {
        throw new Error("Missing verification ID")
      }

      await confirmPhoneAuth(verificationId, data.code)
      
      // Clean up
      sessionStorage.removeItem("phoneAuthVerificationId")
      
      toast({
        title: "Success",
        description: "Phone verification successful. You are now signed in.",
      })
      
      router.push("/family-tree")
    } catch (error) {
      console.error("Verification error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Verification failed. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container flex items-center justify-center min-h-screen py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Verify your phone</CardTitle>
          <CardDescription>
            Enter the 6-digit code sent to {phoneNumber}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Enter verification code"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Verifying..." : "Verify Code"}
              </Button>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() => router.push("/auth")}
            disabled={isLoading}
          >
            Back to Sign In
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
} 