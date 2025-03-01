"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from 'next/navigation'
import { logger } from "@/lib/logger"
import { v4 as uuidv4 } from "uuid"
import { useAuth } from "@/components/auth/AuthContext"
import AuthForm, { LOGIN_FIELDS } from "@/components/auth/AuthForm"

export default function LoginPage() {
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
      
      // Get redirect path from URL params or use default
      const redirectPath = searchParams.get('redirect') || '/family-tree';
      
      // Log the redirect path for debugging
      logger.debug({
        msg: 'Login redirect path',
        component: 'login-page',
        requestId,
        redirectPath
      });
      
      // Call the login method from AuthContext
      // The login method will handle redirects and error toasts automatically
      await auth.login({
        email: String(formData.email),
        password: String(formData.password)
      }, redirectPath);
      
      // If we get here, login was successful (auth.login handles redirects)
      logger.debug({
        msg: 'Login function completed, waiting for redirect',
        component: 'login-page',
        requestId
      });
      
      return { success: true };
    } catch (error: unknown) {
      // This catch block shouldn't execute since auth.login handles errors with toasts
      // But we keep it for defensive programming
      logger.error({
        msg: 'Unexpected login error not handled by auth.login',
        component: 'login-page',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          name: error.name
        } : String(error),
      });
      
      return {
        error: {
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        }
      };
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