"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { toast } from "@/components/ui/use-toast"
import { logger } from "@/lib/logger"
import { v4 as uuidv4 } from "uuid"
import { signUp } from "@/app/actions/auth"
import { AuthField } from "@/components/auth/AuthForm"
import AuthForm from "@/components/auth/AuthForm"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { DateOfBirthPicker } from "@/components/ui/date-of-birth-picker"
import { GenderSelect } from "@/components/ui/gender-select"
import { Input } from "@/components/ui/input"

// Custom signup fields specific to this application
const CUSTOM_SIGNUP_FIELDS: AuthField[] = [
  {
    name: 'firstName',
    label: 'First name',
    type: 'text',
    placeholder: 'Enter your first name',
    required: true,
    autoComplete: 'given-name'
  },
  {
    name: 'lastName',
    label: 'Last name',
    type: 'text',
    placeholder: 'Enter your last name',
    required: true,
    autoComplete: 'family-name'
  },
  {
    name: 'email',
    label: 'Email address',
    type: 'email',
    placeholder: 'Enter your email',
    required: true,
    autoComplete: 'email'
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Choose a password',
    required: true,
    autoComplete: 'new-password'
  },
  {
    name: 'confirmPassword',
    label: 'Confirm password',
    type: 'password',
    placeholder: 'Confirm your password',
    required: true,
    autoComplete: 'new-password'
  },
  {
    name: 'phone',
    label: 'Phone number (optional)',
    type: 'tel',
    placeholder: 'Enter your phone number',
    required: false,
    autoComplete: 'tel'
  }
  // Date of birth and gender are now handled with custom inputs below
];

export default function SignupPage() {
  const router = useRouter()
  const [requestId] = useState(() => uuidv4())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>()
  const [gender, setGender] = useState<string>("")

  // Log page mount/unmount
  useEffect(() => {
    logger.info({
      msg: 'Signup page mounted',
      requestId,
    })

    return () => {
      logger.info({
        msg: 'Signup page unmounted',
        requestId,
      })
    }
  }, [requestId])

  // For complete signup, we'd need a more complex form with date picker and dropdown
  // This is a simplified version that focuses on showing how to use the AuthForm
  const handleSignUp = async (formValues: Record<string, unknown>) => {
    try {
      // Validate passwords match
      if (formValues.password !== formValues.confirmPassword) {
        return { 
          error: { 
            message: 'Passwords do not match'
          }
        };
      }

      // Validate date of birth and gender
      if (!dateOfBirth) {
        setFormErrors(prev => ({ ...prev, dateOfBirth: 'Please select your date of birth' }))
        return { 
          error: { 
            message: 'Please select your date of birth'
          }
        };
      }

      if (!gender) {
        setFormErrors(prev => ({ ...prev, gender: 'Please select your gender' }))
        return { 
          error: { 
            message: 'Please select your gender'
          }
        };
      }

      setIsSubmitting(true);
      
      // Use server action to sign up
      const result = await signUp({
        email: formValues.email as string,
        password: formValues.password as string,
        firstName: formValues.firstName as string,
        lastName: formValues.lastName as string,
        dateOfBirth: dateOfBirth.toISOString(),
        gender: gender as "male" | "female" | "other"
      })
      
      if (result.error) {
        setIsSubmitting(false);
        throw result.error
      }
      
      // Navigate to verification page and show success toast
      router.push('/verify-email')
      toast({
        title: 'Account created!',
        description: 'Please check your email to verify your account.',
      })
      
      return { success: true, needsEmailVerification: true }
    } catch (error: unknown) {
      setIsSubmitting(false);
      console.error('Signup error:', error)
      // Handle specific error cases
      const err = error as { code?: string; message?: string; details?: string }
      
      // Handle PostgrestError (database-specific errors)
      if (err.code === '23505' || err.code === 'user-exists') { // Unique violation
        return {
          error: {
            message: 'An account with this email already exists. Please sign in instead.',
            code: err.code
          }
        }
      } else {
        // Return error details
        return {
          error: {
            message: err.details || err.message || 'Failed to create account. Please try again.',
            code: err.code
          }
        }
      }
    }
  }

  const signupFooter = (
    <p className="mt-2 text-center text-sm text-gray-600">
      Already have an account?{" "}
      <Link
        href="/login"
        className="font-medium text-[#0A5C36] hover:text-[#0A5C36]/80"
      >
        Sign in
      </Link>
    </p>
  );

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const formValues: Record<string, unknown> = {};
    
    // Convert FormData to a plain object using Array.from instead
    Array.from(formData.entries()).forEach(([key, value]) => {
      formValues[key] = value;
    });
    
    handleSignUp(formValues);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/">
          <Image
            src="/dynasty.png"
            alt="Dynasty Logo"
            width={60}
            height={60}
            className="mx-auto h-[60px] w-[60px] cursor-pointer hover:opacity-90 transition-opacity"
            priority
          />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Create your account
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form onSubmit={handleFormSubmit} className="space-y-6">
            {/* First and Last Name Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
                  First name
                </label>
                <Input
                  id="firstName"
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  placeholder="First name"
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
                  Last name
                </label>
                <Input
                  id="lastName"
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  placeholder="Last name"
                />
              </div>
            </div>
            
            {/* Modified AuthForm without firstName and lastName fields */}
            <AuthForm
              fields={CUSTOM_SIGNUP_FIELDS.filter(field => 
                field.name !== 'firstName' && field.name !== 'lastName'
              )}
              onSubmit={() => Promise.resolve({ success: true })} // Dummy function as we're handling submission manually
              submitButtonText=""
              footer={null}
              hideSubmitButton={true}
              renderAsGroup={true}
            />
            
            {/* Date of Birth Picker */}
            <DateOfBirthPicker
              value={dateOfBirth}
              onChange={(date) => {
                setDateOfBirth(date);
                if (date) {
                  setFormErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.dateOfBirth;
                    return newErrors;
                  });
                }
              }}
              error={formErrors.dateOfBirth}
            />
            
            {/* Gender Select */}
            <GenderSelect
              value={gender}
              onChange={(value) => {
                setGender(value);
                if (value) {
                  setFormErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.gender;
                    return newErrors;
                  });
                }
              }}
              error={formErrors.gender}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait
                </>
              ) : (
                "Create account"
              )}
            </Button>
            
            {signupFooter}
          </form>
        </div>
      </div>
    </div>
  )
} 