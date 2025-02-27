import { toast } from '@/components/ui/use-toast'
import { StorageBucket } from '@/lib/shared/types/storage'
import { 
  uploadFile, 
  deleteFile, 
  uploadAndProcessMedia
} from '@/lib/client/services/storage'
import { createLogger } from '@/lib/client/logger'
import { callEdgeFunction } from '@/lib/api-client'

// Create a logger for media utilities
const mediaLogger = createLogger('mediaUtils')

// MARK: - Types

// Type for tracking upload progress
export type UploadProgressCallback = (progress: number) => void

// Type for upload options
export interface UploadOptions {
  bucket?: StorageBucket;
  path?: string;
  processOptions?: {
    resize?: {
      width?: number;
      height?: number;
      quality?: number;
    };
    compress?: {
      quality?: number;
      format?: string;
    };
  };
  onProgress?: UploadProgressCallback;
}

// MARK: - Media Operations
export async function uploadMedia(
  file: File,
  options?: UploadOptions
): Promise<string> {
  const { bucket = 'media', path, processOptions, onProgress } = options || {};

  try {
    mediaLogger.debug('Uploading media', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      bucket,
      path,
      hasProcessOptions: !!processOptions
    });

    // If progress tracking is requested, simulate progress
    if (onProgress) {
      // Need to track progress, let's simulate it while the upload happens
      onProgress(0);
      
      let currentStep = 1;
      const totalSteps = 10;
      
      const simulateProgress = () => {
        const interval = setInterval(() => {
          if (currentStep < totalSteps) {
            onProgress(Math.min(95, (currentStep / totalSteps) * 100));
            currentStep++;
          } else {
            clearInterval(interval);
          }
        }, 500);
        
        return () => clearInterval(interval);
      };
      
      const stopSimulation = simulateProgress();

      // Use storage service for actual upload
      if (processOptions) {
        // Convert process options to storage service format
        const result = await uploadAndProcessMedia({
          file,
          bucket,
          path,
          processOptions: {
            type: 'image',
            quality: processOptions.compress?.quality ? 
              (processOptions.compress.quality > 80 ? 'high' : 
               processOptions.compress.quality > 50 ? 'medium' : 'low') : 'medium',
            maxWidth: processOptions.resize?.width,
            maxHeight: processOptions.resize?.height,
            format: processOptions.compress?.format,
            stripMetadata: true,
          }
        });
        
        stopSimulation();
        onProgress(100);
        
        return result.processedUrl || result.url;
      } else {
        const result = await uploadFile({
          file,
          bucket,
          path
        });
        
        stopSimulation();
        onProgress(100);
        
        return result.url;
      }
    } else {
      // Without progress tracking, use storage service directly
      if (processOptions) {
        // Convert process options to storage service format
        const result = await uploadAndProcessMedia({
          file,
          bucket,
          path,
          processOptions: {
            type: 'image',
            quality: processOptions.compress?.quality ? 
              (processOptions.compress.quality > 80 ? 'high' : 
               processOptions.compress.quality > 50 ? 'medium' : 'low') : 'medium',
            maxWidth: processOptions.resize?.width,
            maxHeight: processOptions.resize?.height,
            format: processOptions.compress?.format,
            stripMetadata: true,
          }
        });
        
        return result.processedUrl || result.url;
      } else {
        const result = await uploadFile({
          file,
          bucket,
          path
        });
        
        return result.url;
      }
    }
  } catch (error) {
    mediaLogger.error('Error uploading media', {
      fileName: file.name,
      fileSize: file.size,
      error: error instanceof Error ? error.message : String(error)
    });
    
    toast({
      variant: "destructive",
      title: "Failed to upload media",
      description: error instanceof Error ? error.message : String(error),
    });
    
    throw error;
  }
}

/**
 * Delete media from a bucket
 * @param url The URL of the media to delete
 * @param bucket The bucket to delete from (default: 'media')
 * @returns true if successful, throws an error otherwise
 */
export async function deleteMedia(url: string, bucket: StorageBucket = 'media'): Promise<boolean> {
  try {
    // Extract the media path from the URL
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    
    // Find the part after /storage/v1/object/public/{bucket}/
    const parts = pathname.split('/');
    const bucketParts = parts.findIndex(p => p === bucket);
    
    if (bucketParts === -1) {
      throw new Error('Invalid media URL, could not extract media path');
    }
    
    const mediaPath = parts.slice(bucketParts + 1).join('/');
    
    if (!mediaPath) {
      throw new Error('Invalid media URL, could not extract media path');
    }
    
    // Delete the file using the storage service
    await deleteFile({
      url,
      bucket
    });
    
    toast({
      title: "Media deleted",
      description: "The media has been successfully deleted",
    });
    
    return true;
  } catch (error) {
    mediaLogger.error('Error deleting media', {
      url,
      bucket,
      error: error instanceof Error ? error.message : String(error)
    });
    
    toast({
      variant: "destructive",
      title: "Failed to delete media",
      description: error instanceof Error ? error.message : String(error),
    });
    
    throw error;
  }
}

/**
 * Process media with various operations
 * @param url The URL of the media to process
 * @param options The processing options
 * @returns The URL of the processed media
 */
export async function processMedia(
  url: string,
  options: {
    resize?: {
      width?: number;
      height?: number;
      quality?: number;
    };
    compress?: {
      quality?: number;
      format?: string;
    };
  }
): Promise<string> {
  try {
    mediaLogger.debug('Processing media', {
      url,
      hasResizeOptions: !!options.resize,
      hasCompressOptions: !!options.compress
    });
    
    // Call the Edge Function through the API client
    const response = await callEdgeFunction<{ processedUrl?: string }>(
      'process-media',
      'POST',
      {
        url,
        options: {
          type: 'image',
          params: {
            quality: options.compress?.quality ? 
              (options.compress.quality > 80 ? 'high' : 
               options.compress.quality > 50 ? 'medium' : 'low') : 'medium',
            width: options.resize?.width,
            height: options.resize?.height,
            format: options.compress?.format,
            stripMetadata: true
          }
        }
      }
    );
    
    if (response.error) {
      throw new Error(response.error.message || 'Failed to process media');
    }
    
    return response.data?.processedUrl || url;
  } catch (error) {
    mediaLogger.error('Error processing media', {
      url,
      error: error instanceof Error ? error.message : String(error)
    });
    
    toast({
      variant: "destructive",
      title: "Failed to process media",
      description: error instanceof Error ? error.message : String(error),
    });
    
    throw error;
  }
}

// MARK: - Validation
export function validateMediaFile(file: File): boolean {
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime'
  ];
  const maxSize = 10 * 1024 * 1024; // 10MB

  if (!allowedTypes.includes(file.type)) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Invalid file type. Please upload an image or video.',
    });
    return false;
  }

  if (file.size > maxSize) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'File too large. Maximum size is 10MB.',
    });
    return false;
  }

  return true;
} 