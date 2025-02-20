"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/context/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn(email, password);
      router.push('/family-tree'); // Update redirect to family tree page
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to sign in';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-md mx-auto p-8 bg-white shadow-xl rounded-xl">
        <div className="flex justify-center mb-6">
          <div className="relative w-24 h-24">
            <Image
              src="/dynasty.png"
              alt="Family Tree Logo"
              fill
              className="object-contain"
              priority
            />
          </div>
        </div>
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">Welcome Back</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to your account</p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Link 
              href="/forgot-password"
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Forgot your password?
            </Link>
          </div>

          <div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </div>
        </form>

        {error && (
          <p className="mt-4 text-center text-sm text-red-600">{error}</p>
        )}

        <p className="mt-4 text-center text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-blue-600 hover:text-blue-500">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
} 