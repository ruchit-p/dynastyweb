"use client"

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { validateFormData, loginFormSchema, type LoginFormData } from '@/lib/validation';
import { toast } from '@/components/ui/use-toast';
import { signIn } from '@/app/actions/auth';
import { showVerificationToast } from '@/components/VerificationToast';

type AuthError = {
  message: string;
  code?: string;
};

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/family-tree';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    try {
      // Validate form data
      const validation = validateFormData(loginFormSchema, formData);
      if (!validation.success) {
        const newErrors: { [key: string]: string } = {};
        validation.errors.forEach((error) => {
          newErrors[error.field] = error.message;
        });
        setErrors(newErrors);
        setIsLoading(false);
        return;
      }

      console.log('Attempting login with:', formData); // Debug log
      
      // Use server action instead of direct client authentication
      const result = await signIn({
        email: formData.email.trim(),
        password: formData.password
      });
      
      if (result.error) {
        throw result.error;
      }
      
      if (result.user) {
        if (!result.user.email_confirmed_at) {
          router.push('/verify-email');
          showVerificationToast();
        } else {
          router.push(redirect);
          toast({
            title: 'Welcome back!',
            description: 'Successfully logged in.',
          });
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      const authError = error as AuthError;
      if (authError.code === 'email_not_confirmed') {
        showVerificationToast();
      } else {
        setErrors({
          email: authError.message || 'Failed to log in',
        });
      }
    } finally {
      setIsLoading(false);
    }
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
          Sign in to Dynasty
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Or{" "}
          <Link
            href="/signup"
            className="font-medium text-[#0A5C36] hover:text-[#0A5C36]/80"
          >
            create a new account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email">Email address</Label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  error={errors.email}
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
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
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  error={errors.password}
                />
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-[#0A5C36] hover:text-[#0A5C36]/80"
                >
                  Forgot your password?
                </Link>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full flex justify-center items-center"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 