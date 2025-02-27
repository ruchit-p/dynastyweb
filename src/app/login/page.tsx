"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from "@/components/ui/use-toast"
import { logger } from "@/lib/logger"
import { v4 as uuidv4 } from "uuid"
import { useAuth } from "@/components/auth/AuthContext"
import AuthForm, { LOGIN_FIELDS } from "@/components/auth/AuthForm"

const showVerificationToast = () => {
  toast({
    title: 'Email Verification Required',
    description: 'Please check your email and click the verification link to complete sign up.',
  });
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const auth = useAuth();
  const [requestId] = useState(() => uuidv4());

  useEffect(() => {
    // Log page mount
    logger.info({
      msg: 'Login page mounted',
      component: 'login-page',
      requestId,
    });

    // Clean up on unmount
    return () => {
      logger.info({
        msg: 'Login page unmounted',
        component: 'login-page',
        requestId,
      });
    };
  }, [requestId]);

  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      // Log login attempt with masked email for privacy
      logger.info({
        msg: 'Login attempt',
        component: 'login-page',
        requestId,
        email: String(formData.email).replace(/(.{3})(.*)(@.*)/, '$1***$3') // Mask email for privacy
      });
      
      // Call the login method from AuthContext
      await auth.login({
        email: String(formData.email),
        password: String(formData.password)
      }, searchParams.get('redirect') || '/family-tree');
      
      // If we get here, login was successful (auth.login handles redirects)
      return { success: true };
    } catch (error: unknown) {
      // Handle specific error cases
      logger.error({
        msg: 'Login failed',
        component: 'login-page',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name
        } : String(error),
      });
      
      const err = error as { message?: string };
      
      if (err.message?.includes('Invalid login credentials')) {
        toast({
          title: 'Login failed',
          description: 'Invalid email or password. Please try again.',
          variant: 'destructive',
        });
        return {
          error: {
            message: 'Invalid email or password. Please try again.'
          }
        };
      } else if (err.message?.includes('Email not confirmed')) {
        showVerificationToast();
        router.push('/verify-email');
        return {
          error: {
            message: 'Please verify your email first'
          },
          needsEmailVerification: true
        };
      } else {
        toast({
          title: 'Login failed',
          description: err.message || 'An error occurred during sign in.',
          variant: 'destructive',
        });
        return {
          error: {
            message: err.message || 'An error occurred during sign in.'
          }
        };
      }
    }
  };

  const loginFooter = (
    <p className="mt-2 text-center text-sm text-gray-600">
      <Link
        href="/forgot-password"
        className="font-medium text-[#0A5C36] hover:text-[#0A5C36]/80"
      >
        Forgot your password?
      </Link>
      <span className="mx-2">•</span>
      <Link
        href="/signup"
        className="font-medium text-[#0A5C36] hover:text-[#0A5C36]/80"
      >
        Create a new account
      </Link>
    </p>
  );

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
          />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign in to Dynasty
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <AuthForm
            fields={LOGIN_FIELDS}
            onSubmit={handleSubmit}
            submitButtonText="Sign in"
            footer={loginFooter}
          />
        </div>
      </div>
    </div>
  );
} 