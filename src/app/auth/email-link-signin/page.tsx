"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";

// Email validation schema
const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

type EmailFormValues = z.infer<typeof emailSchema>;

export default function EmailLinkSignInPage() {
  const [status, setStatus] = useState<"checking" | "verifying" | "needEmail" | "success" | "error">("checking");
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signInWithLink } = useAuth();
  const { toast } = useToast();

  // Email form for when email is not in localStorage
  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    // First, check if this is a sign-in link
    const isSignInLink = async () => {
      try {
        // Get the email from the URL params or localStorage
        const emailFromParams = searchParams.get("email");
        const emailFromStorage = typeof window !== "undefined" ? localStorage.getItem("emailForSignIn") : null;
        
        const emailToUse = emailFromParams || emailFromStorage;
        
        // If we have an email, proceed with verification
        if (emailToUse) {
          setEmail(emailToUse);
          setStatus("verifying");
          
          try {
            await signInWithLink(emailToUse, window.location.href);
            
            // Clear email from localStorage after successful sign-in
            localStorage.removeItem("emailForSignIn");
            localStorage.removeItem("isNewUser");
            
            setStatus("success");
            
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
            
            setStatus("error");
            setErrorMessage(error instanceof Error ? error.message : "Failed to sign in with email link");
            
            toast({
              title: "Error",
              description: error instanceof Error ? error.message : "Failed to sign in with email link",
              variant: "destructive",
            });
          }
        } else {
          // If no email is found, we need to ask the user for it
          setStatus("needEmail");
        }
      } catch (error) {
        console.error("Error in email link sign-in:", error);
        setStatus("error");
        setErrorMessage(error instanceof Error ? error.message : "An error occurred");
      }
    };
    
    isSignInLink();
  }, [router, searchParams, signInWithLink, toast]);

  // Handle email form submission when email is not in localStorage
  const onEmailSubmit = async (data: EmailFormValues) => {
    setEmail(data.email);
    setStatus("verifying");
    
    try {
      await signInWithLink(data.email, window.location.href);
      
      setStatus("success");
      
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
      
      setStatus("error");
      setErrorMessage(error instanceof Error ? error.message : "Failed to sign in with email link");
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to sign in with email link",
        variant: "destructive",
      });
    }
  };

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
            {status === "checking" && "Checking your link"}
            {status === "verifying" && "Verifying your email"}
            {status === "needEmail" && "Enter your email"}
            {status === "success" && "Email verified"}
            {status === "error" && "Error occurred"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {status === "checking" && "Please wait while we check your link..."}
            {status === "verifying" && "Please wait while we verify your email..."}
            {status === "needEmail" && "Please enter the email you used to sign in"}
            {status === "success" && `You are now signed in as ${email}`}
            {status === "error" && errorMessage}
          </p>
        </div>
        
        {(status === "checking" || status === "verifying") && (
          <Card>
            <CardHeader>
              <CardTitle>
                {status === "checking" ? "Checking" : "Verifying"}
              </CardTitle>
              <CardDescription>
                {status === "checking" ? "Checking your link" : "Confirming your identity"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        )}
        
        {status === "needEmail" && (
          <Card>
            <CardHeader>
              <CardTitle>Enter your email</CardTitle>
              <CardDescription>
                Please enter the email address you used to sign in
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...emailForm}>
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
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
                  <Button type="submit" className="w-full">Continue</Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
        
        {status === "success" && (
          <Card>
            <CardHeader>
              <CardTitle>Success</CardTitle>
              <CardDescription>
                You have successfully signed in
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => router.push("/family-tree")}>
                Go to Family Tree
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {status === "error" && (
          <Card>
            <CardHeader>
              <CardTitle>Error</CardTitle>
              <CardDescription>
                There was a problem with your sign-in link
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-4 gap-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-center text-muted-foreground">{errorMessage}</p>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => router.push("/auth")}>
                Return to Sign In
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
} 