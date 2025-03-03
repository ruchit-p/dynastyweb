"use client";

import { AuthForm } from "@/components/AuthForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from "next/image";

export default function AuthPage() {
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
            Welcome to Dynasty
          </h1>
          <p className="text-sm text-muted-foreground">
            Connect with your family across generations
          </p>
        </div>
        <Tabs defaultValue="email" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">Phone</TabsTrigger>
          </TabsList>
          <TabsContent value="email">
            <AuthForm authMethod="email" />
          </TabsContent>
          <TabsContent value="phone">
            <AuthForm authMethod="phone" />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 