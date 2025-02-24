import { z } from 'zod'

// MARK: - Types

export type ValidationResult = {
  success: boolean
  errors: Array<{
    field: string
    message: string
  }>
}

export type LoginFormData = {
  email: string
  password: string
}

export type SignupFormData = {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  phone: string
  dateOfBirth: Date
  gender: 'male' | 'female' | 'other'
}

// MARK: - Schemas

export const loginFormSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
})

export const signupFormSchema = z.object({
  email: z.string()
    .email('Please enter a valid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
  firstName: z.string()
    .min(1, 'First name is required')
    .max(50, 'First name cannot exceed 50 characters'),
  lastName: z.string()
    .min(1, 'Last name is required')
    .max(50, 'Last name cannot exceed 50 characters'),
  phone: z.string()
    .optional(),
  dateOfBirth: z.date()
    .max(new Date(), 'Date of birth cannot be in the future'),
  gender: z.enum(['male', 'female', 'other'])
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

// MARK: - Validation Functions

/**
 * Validates form data against a schema
 */
export function validateFormData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult {
  try {
    schema.parse(data)
    return { success: true, errors: [] }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }))
      }
    }
    return {
      success: false,
      errors: [{
        field: 'unknown',
        message: 'An unexpected error occurred'
      }]
    }
  }
} 