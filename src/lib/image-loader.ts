/**
 * Custom image loader for handling Firebase Storage URLs
 * This bypasses Next.js image optimization for Firebase Storage URLs
 */
import { ImageLoaderProps } from 'next/image';

export const firebaseImageLoader = ({ src }: ImageLoaderProps): string => {
  // Just return the URL as-is, bypassing Next.js image optimization
  return src;
};

/**
 * Checks if a URL is a Firebase Storage URL (either emulator or production)
 */
export const isFirebaseStorageUrl = (url: string): boolean => {
  return (
    url.includes('firebasestorage.googleapis.com') || 
    url.includes('127.0.0.1:9199') ||
    url.includes('dynasty-dev-1b042.firebasestorage.app')
  );
}; 