"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { validateFormData } from "@/lib/validation"
import { z } from "zod"

// Simplified schema for invited signup - only password fields required
const invitedPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/^(?=.*[a-zA-Z])(?=.*[0-9])/, "Password must include letters and numbers"),
  confirmPassword: z.string(),
  invitationId: z.string(),
  token: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

interface InvitedSignupFormData {
  email: string;
  password: string;
  confirmPassword: string;
  invitationId: string;
  token: string;
}

export default function InvitedSignupPage() {
  const [formData, setFormData] = useState<InvitedSignupFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    invitationId: "",
    token: "",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [inviteeEmail, setInviteeEmail] = useState<string>("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUpWithInvitation, verifyInvitation } = useAuth()
  const { toast } = useToast()

  useEffect(() => {
    const token = searchParams.get("token")
    const id = searchParams.get("id")

    if (token && id) {
      setFormData(prev => ({ ...prev, token, invitationId: id }))
      verifyInvitation(token, id)
        .then((data: {
          prefillData: {
            firstName: string;
            lastName: string;
            dateOfBirth?: Date;
            gender?: string;
            phoneNumber?: string;
            relationship?: string;
          };
          inviteeEmail: string;
        }) => {
          setInviteeEmail(data.inviteeEmail || "")
          setFormData(prev => ({
            ...prev,
            email: data.inviteeEmail || "",
          }))
        })
        .catch((error: unknown) => {
          toast({
            title: "Error",
            description: error instanceof Error ? error.message : "Invalid invitation link",
            variant: "destructive",
          })
          router.push("/signup")
        })
    } else {
      router.push("/signup")
    }
  }, [searchParams, router, toast, verifyInvitation])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    // Validate form data
    const validation = validateFormData(invitedPasswordSchema, formData)
    if (!validation.success) {
      const newErrors: { [key: string]: string } = {}
      validation.errors?.forEach((error) => {
        newErrors[error.field] = error.message
        // Show the error in a toast for better visibility
        toast({
          title: "Validation Error",
          description: error.message,
          variant: "destructive",
        })
      })
      setErrors(newErrors)
      setIsLoading(false)
      return
    }

    try {
      await signUpWithInvitation(formData)
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      })
      // Ensure we redirect to verify-email page
      router.push("/verify-email")
    } catch (error) {
      console.error("Signup error:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create account",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/">
          <Image
            src="/dynasty.png"
            alt="Dynasty Logo"
            width={60}
            height={60}
            className="mx-auto"
          />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Complete Your Account Setup
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          You&apos;ve been invited to join a family tree
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={inviteeEmail}
                  disabled={true}
                  className="bg-gray-50"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <div className="mt-1">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="mt-1">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? "border-red-500" : ""}
                />
                {errors.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full bg-[#0A5C36] hover:bg-[#0A5C36]/90 text-white"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Create Account
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 