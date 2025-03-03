"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2, Phone, Globe, Apple } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions } from "@/lib/firebase";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

// Type for the auth method prop
type AuthMethod = "email" | "phone";

// Email validation schema
const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .min(1, "Email is required");

// Phone validation schema
const phoneSchema = z
  .string()
  .min(10, "Phone number must be at least 10 digits")
  .regex(/^\+?[0-9]+$/, "Phone number must contain only digits and may start with +");

// Form schema for email auth
const emailFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

// Form schema for phone auth
const phoneFormSchema = z.object({
  phone: phoneSchema,
});

// Type for email form values
type EmailFormValues = z.infer<typeof emailFormSchema>;

// Type for phone form values
type PhoneFormValues = z.infer<typeof phoneFormSchema>;

// Component props
interface AuthFormProps {
  authMethod: AuthMethod;
}

// Base function to check if email exists using Cloud Function
const checkEmailExistsWithCloudFunction = async (email: string): Promise<boolean | null> => {
  try {
    console.log("Calling Cloud Function to check if email exists:", email);
    const checkEmail = httpsCallable(functions, "checkEmailExists");
    const result = await checkEmail({ email });
    console.log("Email check result from Cloud Function:", result.data);
    return result.data as boolean;
  } catch (error) {
    console.error("Error calling email check Cloud Function:", error);
    // Return null to indicate Cloud Function error
    return null;
  }
};

export function AuthForm({ authMethod }: AuthFormProps) {
  const { signIn, startPhoneAuth, signInWithGoogle, signInWithApple, sendPasswordlessLink } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailExists, setIsEmailExists] = useState<boolean | null>(null);
  const [usePasswordlessSignIn, setUsePasswordlessSignIn] = useState(true);
  
  // Email form
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });
  
  // Phone form
  const phoneForm = useForm<PhoneFormValues>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: {
      phone: "",
    },
  });

  // Check if email exists with fallback for development
  const checkEmailExists = useCallback(async (email: string): Promise<boolean> => {
    try {
      // First attempt to use the Cloud Function
      const cloudFunctionResult = await checkEmailExistsWithCloudFunction(email);
      
      // If we got a valid result, return it
      if (cloudFunctionResult !== null) {
        return cloudFunctionResult;
      }
      
      // If Cloud Function fails (e.g., not deployed yet), use a fallback
      console.warn("Cloud Function failed, using fallback");
      
      // DEVELOPMENT FALLBACK:
      // Simulate email exists if it contains "existing" or ends with ".test"
      const isTestExistingEmail = email.includes("existing") || email.endsWith(".test");
      console.log("Using fallback email check. Result:", isTestExistingEmail);
      
      // Show toast to inform developer that fallback is being used
      toast({
        title: "Development Notice",
        description: "Using fallback email check as the Cloud Function may not be deployed yet.",
        duration: 5000,
      });
      
      return isTestExistingEmail;
    } catch (error) {
      console.error("Error checking email:", error);
      // Return false instead of throwing to prevent form submission from breaking
      return false;
    }
  }, [toast]);

  // Handle email form submission
  const handleEmailSubmit = useCallback(async (data: EmailFormValues) => {
    setIsLoading(true);
    console.log("Form submitted with email:", data.email);
    
    try {
      // If we haven't checked if the email exists yet, check it
      if (isEmailExists === null) {
        console.log("Checking if email exists...");
        let exists = false;
        
        try {
          exists = await checkEmailExists(data.email);
          console.log("Email exists:", exists);
        } catch (emailCheckError) {
          console.error("Error in email check:", emailCheckError);
          toast({
            title: "Error",
            description: "Failed to verify email. Please try again.",
            variant: "destructive",
          });
        }
        
        setIsEmailExists(exists);
        console.log("Updated isEmailExists state to:", exists);
        setIsLoading(false);
      } else {
        // If email exists and user chose password sign-in
        if (isEmailExists && !usePasswordlessSignIn) {
          await signIn(data.email, data.password);
          toast({
            title: "Success",
            description: "You have successfully signed in.",
          });
          router.push("/family-tree");
        } 
        // If email exists and user chose passwordless sign-in OR email doesn't exist (sign-up)
        else {
          // Use our new custom passwordless function
          await sendPasswordlessLink(data.email, !isEmailExists);
          toast({
            title: isEmailExists ? "Sign in link sent" : "Sign up link sent",
            description: `We've sent a ${isEmailExists ? "sign in" : "sign up"} link to your email. Please check your inbox.`,
          });
          router.push(`/auth/email-link-signin?email=${encodeURIComponent(data.email)}`);
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Authentication failed",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  }, [isEmailExists, router, sendPasswordlessLink, signIn, toast, usePasswordlessSignIn, checkEmailExists]);

  // Toggle between password and passwordless sign-in for existing users
  const togglePasswordlessSignIn = useCallback(() => {
    setUsePasswordlessSignIn(prev => !prev);
  }, []);

  // Handle phone form submission
  const handlePhoneSubmit = useCallback(async (data: PhoneFormValues) => {
    setIsLoading(true);
    try {
      // Start phone authentication
      const verificationId = await startPhoneAuth(data.phone);
      // Store verificationId in session storage for verification page
      sessionStorage.setItem("phoneAuthVerificationId", verificationId);
      
      // Redirect to verification page
      router.push(`/verify-phone?phone=${encodeURIComponent(data.phone)}`);
    } catch (error) {
      console.error("Phone authentication error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Phone authentication failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [router, startPhoneAuth, toast]);

  // Handle Google sign-in
  const handleGoogleSignIn = useCallback(async () => {
    setIsLoading(true);
    try {
      await signInWithGoogle();
      toast({
        title: "Success",
        description: "You have successfully signed in with Google.",
      });
      router.push("/family-tree");
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Google sign-in failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [router, signInWithGoogle, toast]);

  // Handle Apple sign-in
  const handleAppleSignIn = useCallback(async () => {
    setIsLoading(true);
    try {
      await signInWithApple();
      toast({
        title: "Success",
        description: "You have successfully signed in with Apple.",
      });
      router.push("/family-tree");
    } catch (error) {
      console.error("Apple sign-in error:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Apple sign-in failed",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [router, signInWithApple, toast]);

  // Render the email form
  const renderEmailForm = () => {
    return (
      <Form {...emailForm}>
        <form onSubmit={emailForm.handleSubmit(handleEmailSubmit)} className="space-y-4">
          <FormField
            control={emailForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="name@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Show password field only if email exists and user chose password sign-in */}
          {isEmailExists !== null && isEmailExists && !usePasswordlessSignIn && (
            <FormField
              control={emailForm.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          
          {/* Show toggle for existing users */}
          {isEmailExists !== null && isEmailExists && (
            <div className="flex items-center space-x-2 text-sm">
              <Switch
                id="passwordless-toggle"
                checked={usePasswordlessSignIn}
                onCheckedChange={togglePasswordlessSignIn}
              />
              <Label htmlFor="passwordless-toggle">
                Use passwordless sign-in (magic link)
              </Label>
            </div>
          )}
          
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEmailExists === null ? "Checking..." : (isEmailExists ? "Signing in..." : "Signing up...")}
              </>
            ) : (
              isEmailExists === null ? "Continue" : (isEmailExists ? "Sign in" : "Sign up")
            )}
          </Button>
        </form>
      </Form>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          Please sign in or sign up below.
        </CardTitle>
        <CardDescription>
          {authMethod === "email" 
            ? (isEmailExists === null 
                ? "Enter your email to continue" 
                : (isEmailExists 
                    ? (usePasswordlessSignIn 
                        ? "We'll send you a secure sign in link" 
                        : "Enter your password to sign in")
                    : "We'll send you a sign up link")) 
            : "Enter your phone number to continue"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {authMethod === "email" ? (
          renderEmailForm()
        ) : (
          <Form {...phoneForm}>
            <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-4">
              <FormField
                control={phoneForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+1 (555) 123-4567" 
                        type="tel" 
                        {...field} 
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending code...
                  </>
                ) : (
                  <>
                    <Phone className="mr-2 h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
            </form>
          </Form>
        )}
        
        {/* Add recaptcha container for phone auth */}
        <div id="recaptcha-container" className="hidden"></div>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <Button variant="outline" onClick={handleGoogleSignIn} disabled={isLoading} type="button">
            <Globe className="mr-2 h-4 w-4" />
            Google
          </Button>
          <Button variant="outline" onClick={handleAppleSignIn} disabled={isLoading} type="button">
            <Apple className="mr-2 h-4 w-4" />
            Apple
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
} 