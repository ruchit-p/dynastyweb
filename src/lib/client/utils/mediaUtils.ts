import { toast } from '@/components/ui/use-toast'
import { uploadFile, processMedia as processMediaAction, uploadAndProcessMedia } from '@/app/actions/storage'
import { StorageBucket } from '@/lib/shared/types/storage'

// MARK: - Types
interface MediaProcessingOptions {
  resize?: {
    width?: number
    height?: number
    fit?: 'cover' | 'contain' | 'fill'
  }
  compress?: {
    quality?: number
    format?: 'jpeg' | 'webp' | 'png'
  }
  metadata?: Record<string, string>
}

interface UploadOptions {
  bucket?: StorageBucket
  path?: string
  processOptions?: MediaProcessingOptions
  onProgress?: (progress: number) => void
}

// MARK: - Media Operations
export async function uploadMedia(
  file: File,
  options: UploadOptions = {}
): Promise<string> {
  const {
    bucket = 'media',
    path = '',
    processOptions,
    onProgress
  } = options

  try {
    // If progress tracking is needed, we need to use FormData with fetch 
    // that uses the upload and process server action
    if (onProgress) {
      // This progress tracking approach requires custom implementation
      // with fetch and FormData, not using the server action directly
      
      // For now, simulating progress with timeouts
      const simulateProgress = () => {
        const steps = [10, 30, 50, 70, 90, 100];
        let currentStep = 0;
        
        const interval = setInterval(() => {
          if (currentStep < steps.length) {
            onProgress(steps[currentStep]);
            currentStep++;
          } else {
            clearInterval(interval);
          }
        }, 500);
        
        return () => clearInterval(interval);
      };
      
      const stopSimulation = simulateProgress();

      // Use server action for actual upload
      if (processOptions) {
        // Convert process options to operations format
        const operations = [];
        
        if (processOptions.resize) {
          operations.push({
            type: 'resize' as const,
            params: processOptions.resize
          });
        }
        
        if (processOptions.compress) {
          operations.push({
            type: 'compress' as const,
            params: processOptions.compress
          });
        }
        
        const result = await uploadAndProcessMedia({
          file,
          bucket,
          path,
          operations
        });
        
        stopSimulation();
        onProgress(100);
        
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to upload and process media');
        }
        
        return result.data.processedUrl || result.data.url;
      } else {
        const result = await uploadFile({
          file,
          bucket,
          path
        });
        
        stopSimulation();
        onProgress(100);
        
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to upload media');
        }
        
        return result.data.url;
      }
    } else {
      // Without progress tracking, use server actions directly
      if (processOptions) {
        // Convert process options to operations format
        const operations = [];
        
        if (processOptions.resize) {
          operations.push({
            type: 'resize' as const,
            params: processOptions.resize
          });
        }
        
        if (processOptions.compress) {
          operations.push({
            type: 'compress' as const,
            params: processOptions.compress
          });
        }
        
        const result = await uploadAndProcessMedia({
          file,
          bucket,
          path,
          operations
        });
        
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to upload and process media');
        }
        
        return result.data.processedUrl || result.data.url;
      } else {
        const result = await uploadFile({
          file,
          bucket,
          path
        });
        
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Failed to upload media');
        }
        
        return result.data.url;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to upload media';
    toast({
      variant: 'destructive',
      title: 'Error',
      description: errorMessage,
    });
    throw error;
  }
}

export async function deleteMedia(url: string, bucket: StorageBucket = 'media'): Promise<void> {
  try {
    const path = url.split('/').pop();
    if (!path) throw new Error('Invalid media URL');

    const response = await fetch('/api/storage/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        bucket,
        paths: [path],
      }),
    });
    
    const result = await response.json();
    if (!result.success) throw new Error(result.error || 'Failed to delete media');

    toast({
      title: 'Success!',
      description: 'Media deleted successfully.',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete media';
    toast({
      variant: 'destructive',
      title: 'Error',
      description: errorMessage,
    });
    throw error;
  }
}

export async function processMedia(
  url: string,
  options: MediaProcessingOptions
): Promise<string> {
  try {
    // Convert options to operations
    const operations = [];
    
    if (options.resize) {
      operations.push({
        type: 'resize' as const,
        params: options.resize
      });
    }
    
    if (options.compress) {
      operations.push({
        type: 'compress' as const,
        params: options.compress
      });
    }
    
    const result = await processMediaAction({
      url,
      operations
    });
    
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to process media');
    }
    
    return result.data.processedUrl;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to process media';
    toast({
      variant: 'destructive',
      title: 'Error',
      description: errorMessage,
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