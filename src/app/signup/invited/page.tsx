"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { invitedSignupFormSchema, type InvitedSignupFormData, validateFormData } from "@/lib/validation"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { EnhancedCalendar } from "@/components/ui/enhanced-calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface PrefillData {
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  gender?: string;
  phoneNumber?: string;
  relationship?: string;
}

export default function InvitedSignupPage() {
  const [formData, setFormData] = useState<InvitedSignupFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    dateOfBirth: new Date(),
    gender: "other",
    invitationId: "",
    token: "",
  })
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [prefillData, setPrefillData] = useState<PrefillData | null>(null)
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
          if (data.prefillData) {
            setPrefillData(data.prefillData)
            setFormData(prev => ({
              ...prev,
              firstName: data.prefillData.firstName || "",
              lastName: data.prefillData.lastName || "",
              dateOfBirth: data.prefillData.dateOfBirth ? new Date(data.prefillData.dateOfBirth) : new Date(),
              gender: (data.prefillData.gender === "male" || data.prefillData.gender === "female" || data.prefillData.gender === "other") 
                ? data.prefillData.gender 
                : "other",
              phone: data.prefillData.phoneNumber || "",
              email: data.inviteeEmail || "",
            }))
          }
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

  const handleGenderChange = (value: "male" | "female" | "other") => {
    setFormData((prev) => ({ ...prev, gender: value }))
    if (errors.gender) {
      setErrors((prev) => ({ ...prev, gender: "" }))
    }
  }

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setFormData((prev) => ({ ...prev, dateOfBirth: date }))
      if (errors.dateOfBirth) {
        setErrors((prev) => ({ ...prev, dateOfBirth: "" }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setErrors({})

    // Validate form data
    const validation = validateFormData(invitedSignupFormSchema, formData)
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
          Complete Your Account Setup
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
                  disabled={!!prefillData}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <div className="mt-1">
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className={errors.firstName ? "border-red-500" : ""}
                  />
                  {errors.firstName && (
                    <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <div className="mt-1">
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={formData.lastName}
                    onChange={handleChange}
                    className={errors.lastName ? "border-red-500" : ""}
                  />
                  {errors.lastName && (
                    <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <div className="mt-1">
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  className={errors.phone ? "border-red-500" : ""}
                />
                {errors.phone && (
                  <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <div className="mt-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !formData.dateOfBirth && "text-muted-foreground",
                        errors.dateOfBirth && "border-red-500"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.dateOfBirth ? (
                        format(formData.dateOfBirth, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <EnhancedCalendar
                      mode="single"
                      selected={formData.dateOfBirth}
                      onSelect={handleDateChange}
                      initialFocus
                      disabled={(date) => {
                        const today = new Date();
                        const birthDate = new Date(date);
                        
                        let age = today.getFullYear() - birthDate.getFullYear();
                        const monthDiff = today.getMonth() - birthDate.getMonth();
                        
                        // Adjust age if birthday hasn't occurred this year
                        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                          age--;
                        }
                        
                        return age < 13;
                      }}
                      fromYear={1900}
                      toYear={new Date().getFullYear()}
                    />
                  </PopoverContent>
                </Popover>
                {errors.dateOfBirth && (
                  <p className="mt-1 text-xs text-red-500">{errors.dateOfBirth}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="gender">Gender</Label>
              <div className="mt-1">
                <Select
                  value={formData.gender}
                  onValueChange={handleGenderChange}
                >
                  <SelectTrigger
                    className={errors.gender ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                {errors.gender && (
                  <p className="mt-1 text-xs text-red-500">{errors.gender}</p>
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
                className="w-full flex justify-center items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Complete Signup
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 