"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useAuth } from "@/components/auth"
import AuthForm, { AuthField } from "@/components/auth/AuthForm"
import { DateOfBirthPicker } from "@/components/ui/date-of-birth-picker"
import { GenderSelect } from "@/components/ui/gender-select"
import { Input } from "@/components/ui/input"

// Define the types we need based on what the API returns
interface AuthResult {
  success: boolean;
  error?: string;
}

// Custom signup fields for the invited user flow
const INVITED_SIGNUP_FIELDS: AuthField[] = [
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
    name: 'phone',
    label: 'Phone number',
    type: 'tel',
    placeholder: 'Enter your phone number',
    required: false,
    autoComplete: 'tel'
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
  }
];

export default function InvitedSignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signUpWithInvitation, verifyInvitation } = useAuth()
  const [formValues, setFormValues] = useState<Record<string, unknown>>({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    phone: "",
    invitationId: "",
    token: ""
  })
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>()
  const [gender, setGender] = useState<string>("")
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isVerifying, setIsVerifying] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const token = searchParams.get("token")
    const id = searchParams.get("id")

    if (!token || !id) {
      router.push("/signup")
      return
    }

    setFormValues((prev) => ({ ...prev, token, invitationId: id }))
    
    const verifyAndPrefill = async () => {
      try {
        setIsVerifying(true)
        // Type assertion to handle the API return type
        const result = await verifyInvitation(token, id) as unknown as { 
          success: boolean;
          prefillData?: {
            firstName: string;
            lastName: string;
            dateOfBirth?: Date;
            gender?: string;
            phoneNumber?: string;
          };
          inviteeEmail?: string;
        }
        
        if (result?.success && result?.prefillData) {
          setFormValues((prev) => ({
            ...prev,
            firstName: result.prefillData?.firstName || "",
            lastName: result.prefillData?.lastName || "",
            phone: result.prefillData?.phoneNumber || "",
            email: result.inviteeEmail || "",
          }))
          
          // Set date of birth and gender separately
          if (result.prefillData?.dateOfBirth) {
            setDateOfBirth(new Date(result.prefillData.dateOfBirth))
          }
          
          if (result.prefillData?.gender === "male" || 
              result.prefillData?.gender === "female" || 
              result.prefillData?.gender === "other") {
            setGender(result.prefillData.gender)
          }
        }
      } catch (error) {
        // Error handling is done by AuthContext
        console.error("Error verifying invitation:", error);
        router.push("/signup")
      } finally {
        setIsVerifying(false)
      }
    }

    verifyAndPrefill()
  }, [searchParams, router, verifyInvitation])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Get all form values including manually added firstName and lastName
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      
      // Update formValues with any changed fields in the form
      const updatedFormValues = { ...formValues };
      Array.from(formData.entries()).forEach(([key, value]) => {
        if (typeof value === 'string') {
          updatedFormValues[key] = value;
        }
      });
      
      // Validate passwords match
      if (updatedFormValues.password !== updatedFormValues.confirmPassword) {
        setFormErrors(prev => ({
          ...prev,
          confirmPassword: 'Passwords do not match'
        }));
        return;
      }

      // Validate date of birth and gender
      if (!dateOfBirth) {
        setFormErrors(prev => ({
          ...prev,
          dateOfBirth: 'Please select your date of birth'
        }));
        return;
      }

      if (!gender) {
        setFormErrors(prev => ({
          ...prev,
          gender: 'Please select your gender'
        }));
        return;
      }

      setIsSubmitting(true);

      // Prepare the complete form data with proper types for the backend
      const completeFormData = {
        email: updatedFormValues.email as string,
        password: updatedFormValues.password as string,
        firstName: updatedFormValues.firstName as string,
        lastName: updatedFormValues.lastName as string,
        dateOfBirth: dateOfBirth!.toISOString(),  // Convert Date to ISO string for backend
        gender: gender as "male" | "female" | "other",
        invitationId: updatedFormValues.invitationId as string,
        token: updatedFormValues.token as string,
        phone: updatedFormValues.phone as string,
      };

      // Use auth service to sign up with invitation and handle the response type
      const result = await signUpWithInvitation(completeFormData) as unknown as AuthResult;
      
      if (!result.success) {
        setFormErrors(prev => ({
          ...prev,
          form: result.error || 'Failed to sign up with invitation'
        }));
        setIsSubmitting(false);
        return;
      }
      
      // Success - let the auth service handle redirection
    } catch (error) {
      console.error('Invitation signup error:', error);
      setFormErrors(prev => ({
        ...prev,
        form: error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred during signup'
      }));
      setIsSubmitting(false);
    }
  };

  const handleAuthFormSubmit = async (formData: Record<string, unknown>) => {
    // Update our form values with the auth form data
    setFormValues(prev => ({
      ...prev,
      ...formData
    }));
    
    // We handle the actual submission separately
    return { success: true };
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Image
          src="/dynasty.png"
          alt="Dynasty Logo"
          width={60}
          height={60}
          className="mx-auto"
        />
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Complete your account setup
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[#0A5C36] hover:text-[#0A5C36]/80"
          >
            Sign in
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {isVerifying ? (
            <div className="flex justify-center">
              <p>Verifying invitation...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
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
                    value={formValues.firstName as string}
                    onChange={(e) => setFormValues(prev => ({ ...prev, firstName: e.target.value }))}
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
                    value={formValues.lastName as string}
                    onChange={(e) => setFormValues(prev => ({ ...prev, lastName: e.target.value }))}
                  />
                </div>
              </div>
              
              {/* Modified AuthForm without firstName and lastName fields */}
              <AuthForm
                fields={INVITED_SIGNUP_FIELDS.filter(field => 
                  field.name !== 'firstName' && field.name !== 'lastName'
                )}
                onSubmit={handleAuthFormSubmit}
                submitButtonText=""
                footer={null}
                initialValues={formValues}
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
                minAge={13}
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
              
              {formErrors.form && (
                <div className="p-3 rounded-md bg-red-50 text-red-500 text-sm">
                  {formErrors.form}
                </div>
              )}
              
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
                  "Complete signup"
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
} 