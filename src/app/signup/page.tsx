"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { toast } from "@/components/ui/use-toast"
import { logger } from "@/lib/logger"
import { v4 as uuidv4 } from "uuid"
import { useAuth } from "@/components/auth/AuthContext"
import { AuthField } from "@/components/auth/AuthForm"
import AuthForm from "@/components/auth/AuthForm"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { DateOfBirthPicker } from "@/components/ui/date-of-birth-picker"
import { GenderSelect } from "@/components/ui/gender-select"
import { Input } from "@/components/ui/input"
import React from "react"

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
  const auth = useAuth()
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
      logger.debug({
        msg: 'Starting sign up process from button click',
        hasFormValues: !!formValues,
        fields: Object.keys(formValues),
      });

      // Validate passwords match
      if (formValues.password !== formValues.confirmPassword) {
        setFormErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }))
        toast({
          title: 'Error',
          description: 'Passwords do not match',
          variant: 'destructive'
        });
        return { 
          error: { 
            message: 'Passwords do not match'
          }
        };
      }

      // Validate date of birth and gender
      if (!dateOfBirth) {
        setFormErrors(prev => ({ ...prev, dateOfBirth: 'Please select your date of birth' }))
        toast({
          title: 'Error',
          description: 'Please select your date of birth',
          variant: 'destructive'
        });
        return { 
          error: { 
            message: 'Please select your date of birth'
          }
        };
      }

      if (!gender) {
        setFormErrors(prev => ({ ...prev, gender: 'Please select your gender' }))
        toast({
          title: 'Error',
          description: 'Please select your gender',
          variant: 'destructive'
        });
        return { 
          error: { 
            message: 'Please select your gender'
          }
        };
      }

      setIsSubmitting(true);
      
      // Log signup attempt details (masking sensitive data)
      logger.info({
        msg: 'Submitting signup data',
        email: String(formValues.email).replace(/(.{3})(.*)(@.*)/, '$1***$3'),
        hasPassword: !!formValues.password,
        firstName: formValues.firstName,
        lastName: formValues.lastName,
        hasDateOfBirth: !!dateOfBirth,
        gender
      });
      
      // Use Auth Context to sign up with Supabase
      const result = await auth.signUp({
        email: formValues.email as string,
        password: formValues.password as string,
        firstName: formValues.firstName as string,
        lastName: formValues.lastName as string,
        dateOfBirth: dateOfBirth.toISOString(),
        gender: gender as "male" | "female" | "other"
      });
      
      logger.info({
        msg: 'Signup result received',
        success: result.success,
        hasError: !!result.error,
        needsEmailVerification: result.needsEmailVerification
      });
      
      setIsSubmitting(false);
      
      if (result.error) {
        // Handle specific error cases
        if (result.error.code === '23505' || result.error.code === 'user-exists') {
          toast({
            title: 'Account exists',
            description: 'An account with this email already exists. Please sign in instead.',
            variant: 'destructive'
          })
        } else {
          toast({
            title: 'Signup failed',
            description: result.error.message || 'An unexpected error occurred',
            variant: 'destructive'
          })
        }
        
        return { 
          success: false, 
          error: result.error 
        };
      }
      
      // If signup successful but verification needed, redirect to verification page
      if (result.needsEmailVerification) {
        // Navigate to verification page and show success toast
        router.push('/verify-email')
        toast({
          title: 'Account created!',
          description: 'Please check your email to verify your account.',
        })
      } else {
        // If no verification needed, redirect to family tree
        router.push('/family-tree')
        toast({
          title: 'Account created!',
          description: 'Your account has been created successfully.',
        })
      }
      
      return { success: true, needsEmailVerification: result.needsEmailVerification }
    } catch (error: unknown) {
      setIsSubmitting(false);
      const errorMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
      
      logger.error({
        msg: 'Unexpected signup error',
        error: errorMsg,
        stack: error instanceof Error ? error.stack : undefined
      });
      
      toast({
        title: 'Signup failed',
        description: errorMsg,
        variant: 'destructive'
      });
      
      return {
        success: false,
        error: {
          message: errorMsg
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    logger.debug({
      msg: 'Form submitted',
      requestId
    });
    
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    const formValues: Record<string, unknown> = {};
    
    // Convert FormData to a plain object using Array.from instead of iterator
    Array.from(formData.entries()).forEach(([key, value]) => {
      formValues[key] = value;
    });
    
    // Add debugging to see if form values are being collected
    logger.debug({
      msg: 'Form values collected',
      formKeys: Object.keys(formValues),
      hasEmail: !!formValues.email,
      hasPassword: !!formValues.password,
      hasFirstName: !!formValues.firstName,
      hasLastName: !!formValues.lastName
    });
    
    await handleSignUp(formValues);
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