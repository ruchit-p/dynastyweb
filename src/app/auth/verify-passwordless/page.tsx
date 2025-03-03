"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, CheckCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Form schema for completing profile
const profileFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  phone: z.string().optional(),
  dateOfBirth: z.string().refine((date) => {
    const dateObj = new Date(date);
    const today = new Date();
    const minAge = 13;
    const minDate = new Date(today.getFullYear() - minAge, today.getMonth(), today.getDate());
    return dateObj <= minDate;
  }, "You must be at least 13 years old"),
  gender: z.enum(["male", "female", "other"]),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function VerifyPasswordlessPage() {
  const [status, setStatus] = useState<"verifying" | "profile" | "success">("verifying");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [isNewUser, setIsNewUser] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyPasswordlessLink, completePasswordlessSignUp } = useAuth();
  const { toast } = useToast();

  // Profile form
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      dateOfBirth: "",
      gender: "other",
    },
  });

  useEffect(() => {
    // Get parameters from URL
    const token = searchParams.get("token");
    const emailParam = searchParams.get("email");
    const isNewUserParam = searchParams.get("isNewUser");
    
    if (!token || !emailParam) {
      toast({
        title: "Error",
        description: "Invalid link. Please try signing in again.",
        variant: "destructive",
      });
      router.push("/auth");
      return;
    }
    
    setEmail(emailParam);
    setIsNewUser(isNewUserParam === "true");
    
    // Verify the passwordless link
    const verifyLink = async () => {
      try {
        const uid = await verifyPasswordlessLink(token, emailParam, isNewUserParam === "true");
        setUserId(uid);
        
        // If this is a new user, show the profile form
        if (isNewUserParam === "true") {
          setStatus("profile");
        } else {
          setStatus("success");
          
          // Redirect to family tree page after a delay
          setTimeout(() => {
            router.push("/family-tree");
          }, 2000);
        }
      } catch (error) {
        console.error("Error verifying passwordless link:", error);
        
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to verify link",
          variant: "destructive",
        });
        
        router.push("/auth");
      }
    };
    
    verifyLink();
  }, [router, searchParams, verifyPasswordlessLink, toast]);

  // Handle profile form submission
  const onSubmit = async (data: ProfileFormValues) => {
    try {
      // Create a random password (user can set a real one later if desired)
      const randomPassword = Math.random().toString(36).slice(-8);
      
      await completePasswordlessSignUp({
        email,
        password: randomPassword,
        confirmPassword: randomPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone || "",
        dateOfBirth: new Date(data.dateOfBirth),
        gender: data.gender,
      });
      
      setStatus("success");
      
      toast({
        title: "Success",
        description: "Your profile has been created successfully.",
      });
      
      // Redirect to family tree page after a delay
      setTimeout(() => {
        router.push("/family-tree");
      }, 2000);
    } catch (error) {
      console.error("Error completing profile:", error);
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to complete profile",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[450px]">
        <div className="flex flex-col space-y-2 text-center">
          <Image
            src="/dynasty.png"
            alt="Dynasty Logo"
            width={60}
            height={60}
            className="mx-auto"
          />
          <h1 className="text-2xl font-semibold tracking-tight">
            {status === "verifying" && "Verifying your email"}
            {status === "profile" && "Complete your profile"}
            {status === "success" && "Email verified"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {status === "verifying" && "Please wait while we verify your email..."}
            {status === "profile" && "Please provide some information to complete your profile"}
            {status === "success" && `You are now signed in as ${email}`}
          </p>
        </div>
        
        {status === "verifying" && (
          <Card>
            <CardHeader>
              <CardTitle>Verifying</CardTitle>
              <CardDescription>Confirming your identity</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          </Card>
        )}
        
        {status === "profile" && (
          <Card>
            <CardHeader>
              <CardTitle>Complete your profile</CardTitle>
              <CardDescription>Please provide the following information</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="+1234567890" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="gender"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gender</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your gender" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full">
                    Complete Profile
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}
        
        {status === "success" && (
          <Card>
            <CardHeader>
              <CardTitle>Success</CardTitle>
              <CardDescription>You have successfully signed in</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center py-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 