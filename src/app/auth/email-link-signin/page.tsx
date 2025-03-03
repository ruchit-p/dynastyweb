"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";

export default function EmailLinkSignInPage() {
  const [isVerifying, setIsVerifying] = useState(true);
  const [email, setEmail] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithLink } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    // Get the email from the URL params or localStorage
    const emailFromParams = searchParams.get("email");
    const emailFromStorage = typeof window !== "undefined" ? localStorage.getItem("emailForSignIn") : null;
    
    const emailToUse = emailFromParams || emailFromStorage;
    
    if (!emailToUse) {
      toast({
        title: "Error",
        description: "No email found. Please try signing in again.",
        variant: "destructive",
      });
      router.push("/auth");
      return;
    }
    
    setEmail(emailToUse);
    
    // Check if this is a passwordless authentication
    const isPasswordless = localStorage.getItem("isNewUser") !== null;
    
    if (isPasswordless) {
      // Redirect to the verify-passwordless page
      const isNewUser = localStorage.getItem("isNewUser") === "true";
      router.push(`/auth/verify-passwordless?email=${encodeURIComponent(emailToUse)}&isNewUser=${isNewUser}`);
      return;
    }
    
    // Check if this is a sign-in link
    const handleSignIn = async () => {
      try {
        await signInWithLink(emailToUse, window.location.href);
        
        // Clear email from localStorage after successful sign-in
        localStorage.removeItem("emailForSignIn");
        
        setIsVerifying(false);
        
        toast({
          title: "Success",
          description: "You have successfully signed in.",
        });
        
        // Redirect to family tree page
        setTimeout(() => {
          router.push("/family-tree");
        }, 2000);
      } catch (error) {
        console.error("Error signing in with email link:", error);
        
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to sign in with email link",
          variant: "destructive",
        });
        
        router.push("/auth");
      }
    };
    
    handleSignIn();
  }, [router, searchParams, signInWithLink, toast]);

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
        <div className="flex flex-col space-y-2 text-center">
          <Image
            src="/dynasty.png"
            alt="Dynasty Logo"
            width={60}
            height={60}
            className="mx-auto"
          />
          <h1 className="text-2xl font-semibold tracking-tight">
            {isVerifying ? "Verifying your email" : "Email verified"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isVerifying ? "Please wait while we verify your email..." : `You are now signed in as ${email}`}
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>
              {isVerifying ? "Verifying" : "Success"}
            </CardTitle>
            <CardDescription>
              {isVerifying 
                ? "Confirming your identity" 
                : "You have successfully signed in"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center py-4">
            {isVerifying ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <CheckCircle className="h-8 w-8 text-green-500" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 