'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';

// Define the different field types to support
export type AuthField = {
  name: string;
  label: string;
  type: string;
  placeholder?: string;
  required?: boolean;
  autoComplete?: string;
};

// Define custom field renderer type
export type CustomFieldRenderer = {
  name: string;
  render: (
    value: unknown, 
    onChange: (value: unknown) => void, 
    error?: string
  ) => React.ReactNode;
};

// Standard fields for login and signup
export const LOGIN_FIELDS: AuthField[] = [
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'Enter your email',
    required: true,
    autoComplete: 'email'
  },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    placeholder: 'Enter your password',
    required: true,
    autoComplete: 'current-password'
  }
];

export const SIGNUP_FIELDS: AuthField[] = [
  {
    name: 'email',
    label: 'Email',
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
    name: 'firstName',
    label: 'First Name',
    type: 'text',
    placeholder: 'Enter your first name',
    required: true,
    autoComplete: 'given-name'
  },
  {
    name: 'lastName',
    label: 'Last Name',
    type: 'text',
    placeholder: 'Enter your last name',
    required: true,
    autoComplete: 'family-name'
  }
];

// Define the type for authentication responses
export type AuthResponse = {
  success?: boolean;
  error?: {
    message: string;
    code?: string;
  };
  needsEmailVerification?: boolean;
  redirectTo?: string;
};

interface AuthFormProps {
  fields: AuthField[];
  onSubmit: (formData: Record<string, unknown>) => Promise<AuthResponse>;
  submitButtonText: string;
  className?: string;
  redirectPath?: string;
  footer?: React.ReactNode;
  initialValues?: Record<string, unknown>;
  customFields?: CustomFieldRenderer[];
  hideSubmitButton?: boolean;
  renderAsGroup?: boolean;
}

/**
 * A reusable authentication form component that can be used for login, signup, etc.
 * Accepts custom fields and handles the form submission
 */
export default function AuthForm({
  fields,
  onSubmit,
  submitButtonText,
  className = '',
  redirectPath,
  footer,
  initialValues = {},
  customFields = [],
  hideSubmitButton = false,
  renderAsGroup = false
}: AuthFormProps) {
  const [formData, setFormData] = useState<Record<string, unknown>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleCustomFieldChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when field is edited
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await onSubmit(formData);

      if (result?.error) {
        setErrors({ 
          form: result.error.message || 'An error occurred during authentication' 
        });
        toast({
          title: 'Authentication Error',
          description: result.error.message || 'An error occurred during authentication',
          variant: 'destructive'
        });
      } else if (result?.success && redirectPath) {
        router.push(redirectPath);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setErrors({ 
        form: error instanceof Error ? error.message : 'An unexpected error occurred' 
      });
      toast({
        title: 'Authentication Error',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // The form content that will be either wrapped in a form or div
  const formContent = (
    <>
      {fields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={field.name}>{field.label}</Label>
          <Input
            id={field.name}
            name={field.name}
            type={field.type}
            placeholder={field.placeholder}
            required={field.required}
            autoComplete={field.autoComplete}
            value={(formData[field.name] as string) || ''}
            onChange={handleChange}
            className="w-full"
          />
          {errors[field.name] && (
            <p className="text-sm text-red-500">{errors[field.name]}</p>
          )}
        </div>
      ))}

      {/* Render custom fields */}
      {customFields.map((customField) => (
        <div key={customField.name} className="space-y-2">
          {customField.render(
            formData[customField.name], 
            (value: unknown) => handleCustomFieldChange(customField.name, value),
            errors[customField.name]
          )}
        </div>
      ))}

      {errors.form && (
        <div className="p-3 rounded-md bg-red-50 text-red-500 text-sm">
          {errors.form}
        </div>
      )}

      {!hideSubmitButton && (
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
            submitButtonText
          )}
        </Button>
      )}

      {footer}
    </>
  );

  // Render either as a form or as a div based on the renderAsGroup prop
  return renderAsGroup ? (
    <div className={`space-y-6 ${className}`}>
      {formContent}
    </div>
  ) : (
    <form onSubmit={handleSubmit} className={`space-y-6 ${className}`}>
      {formContent}
    </form>
  );
}

/**
 * Login form footer with link to signup page
 */
export function LoginFormFooter() {
  return (
    <div className="mt-4 text-center text-sm">
      Don&apos;t have an account?{' '}
      <Link href="/signup" className="font-medium text-blue-600 hover:text-blue-500">
        Sign up
      </Link>
    </div>
  );
}

/**
 * Signup form footer with link to login page
 */
export function SignupFormFooter() {
  return (
    <div className="mt-4 text-center text-sm">
      Already have an account?{' '}
      <Link href="/login" className="font-medium text-blue-600 hover:text-blue-500">
        Log in
      </Link>
    </div>
  );
} 