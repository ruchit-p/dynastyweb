/**
 * Simple in-memory cache for images to reduce redundant requests
 * and provide consistent loading experience across pages.
 */

// Cache for profile pictures to avoid redundant requests across pages
export const profilePictureCache = new Map<string, string>();

/**
 * Preload an image into browser cache and optional in-memory cache
 * @param src Image URL to preload
 * @param cacheKey Optional key to store in memory cache
 * @returns Promise that resolves when image is loaded
 */
export const preloadImage = (src: string, cacheKey?: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Skip if we're on the server
    if (typeof window === 'undefined') {
      resolve();
      return;
    }

    // Skip if already in cache
    if (cacheKey && profilePictureCache.has(cacheKey)) {
      resolve();
      return;
    }

    // Create a new image to trigger browser caching
    const img = new window.Image();
    img.src = src;
    
    img.onload = () => {
      // Add to our in-memory cache if a key is provided
      if (cacheKey) {
        profilePictureCache.set(cacheKey, src);
      }
      resolve();
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${src}`));
    };
  });
};

/**
 * Get an image from the cache or return the original source
 * @param userId User ID to use as the cache key
 * @param imageSrc Original image source URL
 * @returns Cached image URL or original source
 */
export const getCachedProfilePicture = (userId: string, imageSrc?: string): string | undefined => {
  if (!imageSrc) return undefined;
  return profilePictureCache.get(userId) || imageSrc;
}; 