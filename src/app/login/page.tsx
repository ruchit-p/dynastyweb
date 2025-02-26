"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from "@/components/ui/use-toast"
import { logger } from "@/lib/logger"
import { v4 as uuidv4 } from "uuid"
import { signIn } from "@/app/actions/auth"
import AuthForm, { LOGIN_FIELDS } from "@/components/auth/AuthForm"
import { AuthError } from "@supabase/supabase-js"

const showVerificationToast = () => {
  toast({
    title: 'Email Verification Required',
    description: 'Please check your email and click the verification link to complete sign up.',
  });
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/family-tree';
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

  const handleSubmit = async (formData: Record<string, string>) => {
    // Log login attempt with masked email for privacy
    logger.info({
      msg: 'Login attempt',
      component: 'login-page',
      requestId,
      email: formData.email.replace(/(.{3})(.*)(@.*)/, '$1***$3') // Mask email for privacy
    });

    try {
      const result = await signIn({
        email: formData.email,
        password: formData.password
      });
      
      if (result.error) {
        throw result.error;
      }
      
      if (result.user) {
        if (!result.user.email_confirmed_at) {
          logger.info({
            msg: 'Email not confirmed, redirecting to verification page',
            component: 'login-page',
            requestId,
            email: formData.email.replace(/(.{3})(.*)(@.*)/, '$1***$3') // Mask email for privacy
          });
          
          router.push('/verify-email');
          showVerificationToast();
          return { needsEmailVerification: true };
        } else {
          logger.info({
            msg: 'Login successful, redirecting to destination',
            component: 'login-page',
            requestId,
            userId: result.user.id,
            redirectPath: redirect
          });
          
          router.push(redirect);
          toast({
            title: 'Welcome back!',
            description: 'Successfully logged in.',
          });
          return { success: true, redirectTo: redirect };
        }
      }
      
      return { success: true };
    } catch (error) {
      logger.error({
        msg: 'Login failed',
        component: 'login-page',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name
        } : String(error),
        email: formData.email.replace(/(.{3})(.*)(@.*)/, '$1***$3') // Mask email for privacy
      });
      
      const authError = error as AuthError;
      if (authError.code === 'email_not_confirmed') {
        showVerificationToast();
        return { 
          error: { 
            message: 'Please verify your email first', 
            code: 'email_not_confirmed' 
          },
          needsEmailVerification: true
        };
      } else {
        return { 
          error: { 
            message: authError.message || 'Invalid email or password',
            code: authError.code 
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