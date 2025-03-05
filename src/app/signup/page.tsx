"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"

export default function SignupPage() {
  const [formData, setFormData] = useState<{
    email: string;
    password: string;
    confirmPassword: string;
  }>({
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { signUp } = useAuth()
  const { toast } = useToast()

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

    // Basic validation
    if (!formData.email) {
      setErrors(prev => ({ ...prev, email: "Email is required" }))
      setIsLoading(false)
      return
    }

    if (!formData.password) {
      setErrors(prev => ({ ...prev, password: "Password is required" }))
      setIsLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setErrors(prev => ({ 
        ...prev, 
        confirmPassword: "Passwords do not match",
        password: "Passwords do not match"
      }))
      setIsLoading(false)
      return
    }

    try {
      await signUp(
        formData.email,
        formData.password
      )
      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      })
      router.push("/verify-email")
    } catch (error) {
      console.error("Signup error:", error)
      
      // Handle specific validation errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase()
        
        if (errorMessage.includes("passwords do not match")) {
          setErrors(prev => ({
            ...prev,
            confirmPassword: "Passwords do not match",
            password: "Passwords do not match"
          }))
          toast({
            title: "Password Error",
            description: "The passwords you entered do not match. Please try again.",
            variant: "destructive",
          })
        } else if (errorMessage.includes("email already exists")) {
          setErrors(prev => ({
            ...prev,
            email: "An account with this email already exists"
          }))
          toast({
            title: "Email Error",
            description: "An account with this email already exists. Please use a different email or sign in.",
            variant: "destructive",
          })
        } else if (errorMessage.includes("invalid email")) {
          setErrors(prev => ({
            ...prev,
            email: "Please enter a valid email address"
          }))
          toast({
            title: "Email Error",
            description: "Please enter a valid email address.",
            variant: "destructive",
          })
        } else if (errorMessage.includes("password") && errorMessage.includes("least")) {
          setErrors(prev => ({
            ...prev,
            password: "Password must meet all requirements"
          }))
          toast({
            title: "Password Error",
            description: error.message,
            variant: "destructive",
          })
        } else {
          // Generic error handling
          toast({
            title: "Error",
            description: error.message,
            variant: "destructive",
          })
        }
      } else {
        // Fallback error message
        toast({
          title: "Error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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
          Create Your Account
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[#0A5C36] hover:text-[#0A5C36]/80"
          >
            Sign In
          </Link>
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
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                )}
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
                className="w-full bg-[#0A5C36] hover:bg-[#0A5C36]/80"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  "Sign Up"
                )}
              </Button>
            </div>
            
            <div className="text-center text-sm text-gray-500">
              By signing up, you agree to our{" "}
              <Link href="/terms" className="font-medium text-[#0A5C36]">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-[#0A5C36]">
                Privacy Policy
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 