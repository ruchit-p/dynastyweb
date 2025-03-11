"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { loginFormSchema, type LoginFormData, validateFormData } from '@/lib/validation';
import { GoogleSignInButton } from '@/components/ui/google-sign-in-button';
import { AppleSignInButton } from '@/components/ui/apple-sign-in-button';

export default function LoginPage() {
  const [formData, setFormData] = useState<LoginFormData>({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);
  const router = useRouter();
  const { signIn, signInWithGoogle, signInWithApple, currentUser } = useAuth();
  const { toast } = useToast();

  // Add effect to handle post-login navigation
  useEffect(() => {
    if (currentUser) {
      if (!currentUser.emailVerified) {
        toast({
          title: "Email verification required",
          description: "Please verify your email address to continue.",
        });
        router.push('/verify-email');
      } else {
        router.push('/family-tree');
      }
    }
  }, [currentUser, router, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Validate form data
    const validation = validateFormData(loginFormSchema, formData);
    if (!validation.success) {
      const newErrors: { [key: string]: string } = {};
      validation.errors?.forEach((error) => {
        newErrors[error.field] = error.message;
      });
      setErrors(newErrors);
      setIsLoading(false);
      return;
    }

    try {
      await signIn(formData.email, formData.password);
      toast({
        title: "Welcome back!",
        description: "You have successfully logged in.",
      });
    } catch (error) {
      console.error("Login error:", error);
      
      // Handle Firebase-specific authentication errors with user-friendly messages
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        const errorCode = errorMessage.includes('auth/') 
          ? errorMessage.split('auth/')[1].split(')')[0].trim() 
          : '';
        
        switch (errorCode) {
          case 'invalid-credential':
            toast({
              title: "Invalid Credentials",
              description: "The email or password you entered is incorrect. Please try again.",
              variant: "destructive",
            });
            break;
          case 'user-not-found':
            toast({
              title: "User not found",
              description: "No account exists with this email address. Please check your email or create a new account.",
              variant: "destructive",
            });
            break;
          case 'wrong-password':
            toast({
              title: "Invalid Credentials",
              description: "The email or password you entered is incorrect. Please try again.",
              variant: "destructive",
            });
            break;
          case 'too-many-requests':
            toast({
              title: "Too many attempts",
              description: "Access to this account has been temporarily disabled due to many failed login attempts. Please try again later.",
              variant: "destructive",
            });
            break;
          case 'user-disabled':
            toast({
              title: "Account disabled",
              description: "This account has been disabled. Please contact support for help.",
              variant: "destructive",
            });
            break;
          default:
            toast({
              title: "Login failed",
              description: "Unable to sign in. Please check your credentials and try again.",
              variant: "destructive",
            });
        }
      } else {
        // Fallback for non-Error objects
        toast({
          title: "Login error",
          description: "An unexpected error occurred. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      await signInWithGoogle();
      toast({
        title: "Welcome!",
        description: "You have successfully signed in with Google.",
      });
    } catch (error) {
      console.error("Google login error:", error);
      toast({
        title: "Sign-in Failed",
        description: "Unable to sign in with Google. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setIsAppleLoading(true);
    try {
      await signInWithApple();
      toast({
        title: "Welcome!",
        description: "You have successfully signed in with Apple.",
      });
    } catch (error) {
      console.error("Apple login error:", error);
      toast({
        title: "Sign-in Failed",
        description: "Unable to sign in with Apple. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAppleLoading(false);
    }
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
            className="mx-auto"
          />
        </Link>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Sign In to Dynasty
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-[#0A5C36] hover:text-[#0A5C36]/80"
          >
            Create a New Account
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <Label htmlFor="email">Email Address</Label>
              <div className="mt-1">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="mt-1 text-xs text-red-500">{errors.email}</p>
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
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <p className="mt-1 text-xs text-red-500">{errors.password}</p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end">
              <div className="text-sm">
                <Link
                  href="/forgot-password"
                  className="font-medium text-[#0A5C36] hover:text-[#0A5C36]/80"
                >
                  Forgot Your Password?
                </Link>
              </div>
            </div>

            <div>
              <Button
                type="submit"
                className="w-full bg-[#0A5C36] hover:bg-[#0A5C36]/80"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </div>
            
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with</span>
              </div>
            </div>
            
            <div>
              <GoogleSignInButton 
                onClick={handleGoogleSignIn} 
                loading={isGoogleLoading} 
              />
            </div>
            
            <div className="mt-3">
              <AppleSignInButton 
                onClick={handleAppleSignIn} 
                loading={isAppleLoading} 
              />
            </div>
            
            <div className="text-center text-sm text-gray-500 mt-4">
              By signing in, you agree to our{" "}
              <Link href="/terms" className="font-medium text-[#0A5C36]">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link href="/privacy" className="font-medium text-[#0A5C36]">
                Privacy Policy
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 