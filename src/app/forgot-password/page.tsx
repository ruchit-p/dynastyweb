"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/components/ui/use-toast';
import { createClient } from '@/lib/client/supabase-browser';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/lib/shared/types/supabase';
import AuthForm, { AuthField } from '@/components/auth/AuthForm';

// Define the fields for the forgot password form
const FORGOT_PASSWORD_FIELDS: AuthField[] = [
  {
    name: 'email',
    label: 'Email',
    type: 'email',
    placeholder: 'Enter your email address',
    required: true,
    autoComplete: 'email'
  }
];

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [supabase, setSupabase] = useState<SupabaseClient<Database> | null>(null);

  useEffect(() => {
    const initSupabase = async () => {
      const client = createClient();
      setSupabase(client);
    };
    
    initSupabase();
  }, []);

  const handleResetPassword = async (formData: Record<string, string>) => {
    setMessage('');

    if (!supabase) {
      return {
        error: {
          message: 'Unable to connect to authentication service'
        }
      };
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(formData.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
      });

      if (error) throw error;

      setMessage('Check your email for password reset instructions');
      toast({
        title: "Email sent",
        description: "Check your email for password reset instructions.",
      });
      
      // Optional: redirect to login page after a few seconds
      setTimeout(() => router.push('/login'), 5000);
      
      return { success: true };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      return {
        error: {
          message: errorMessage
        }
      };
    }
  };

  const forgotPasswordFooter = (
    <>
      {message && (
        <p className="mt-4 text-center text-sm text-green-600">{message}</p>
      )}
      <p className="mt-4 text-center text-sm text-gray-600">
        Remember your password?{' '}
        <Link href="/login" className="font-medium text-[#0A5C36] hover:text-[#0A5C36]/80">
          Sign in
        </Link>
      </p>
    </>
  );

  return (
    <div className="h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto p-8 bg-white shadow-xl rounded-xl">
        <div className="flex justify-center mb-6">
          <div className="relative w-24 h-24">
            <Link href="/">
              <Image
                src="/dynasty.png"
                alt="Family Tree Logo"
                fill
                className="object-contain cursor-pointer hover:opacity-90 transition-opacity"
                priority
              />
            </Link>
          </div>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">Reset Password</h2>
          <p className="mt-2 text-sm text-gray-600">
            Enter your email address and we&apos;ll send you instructions to reset your password
          </p>
        </div>

        <AuthForm
          fields={FORGOT_PASSWORD_FIELDS}
          onSubmit={handleResetPassword}
          submitButtonText="Reset Password"
          footer={forgotPasswordFooter}
        />
      </div>
    </div>
  );
} 