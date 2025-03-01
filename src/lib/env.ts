/**
 * Environment utilities for managing configuration in different environments
 */
import { z } from 'zod';

// Environment schema validation
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Type for our environment variables
export type Env = z.infer<typeof envSchema>;

/**
 * Validate environment variables and return typed values
 * @throws Error if validation fails
 */
export function getEnv(): Env {
  try {
    return envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      NODE_ENV: process.env.NODE_ENV,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Environment validation failed:', error);
    throw new Error('Missing or invalid environment variables');
  }
}

/**
 * Check if the app is running in production
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Check if the app is running in development
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Get the base URL of the application
 */
export function getBaseUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || 
    (typeof window !== 'undefined' 
      ? window.location.origin
      : 'http://localhost:3000');
}

/**
 * Create a full URL from a path
 */
export function createUrl(path: string): string {
  return `${getBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;
}