'use server'

import { createClient } from '@/lib/server/supabase'
import { withAuth } from '@/lib/server/middleware'
import { StorageBucket } from '@/lib/shared/types/storage'
import { validateFile } from '@/lib/shared/validation/storage'
import { logger } from '@/lib/server/logger'
import type { ServerActionResult } from '@/lib/shared/types/actions'
import type { FileObject } from '@supabase/storage-js'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

// MARK: - Types
export type UploadResult = {
  path: string
  url: string
  error?: string
}

export type StorageError = {
  message: string
  code?: string
}

export type UploadFileInput = {
  file: File
  bucket: StorageBucket
  path?: string
  options?: {
    upsert?: boolean,
    cacheControl?: string,
    contentType?: string
  }
}

export type DownloadFileInput = {
  bucket: StorageBucket
  path: string
}

export type CreateSignedUrlInput = {
  bucket: StorageBucket
  path: string
  expiresIn?: number
}

export type ListFilesInput = {
  bucket: StorageBucket
  path?: string
  options?: {
    limit?: number,
    offset?: number,
    sortBy?: {
      column: string,
      order: 'asc' | 'desc'
    }
  }
}

export type DeleteFileInput = {
  bucket: StorageBucket
  paths: string | string[]
}

export type StorageStats = {
  totalSize: number;
  fileCount: number;
  lastModified: string;
};

// MARK: - Validation Schemas

const StorageBucketSchema = z.enum([
  'profile-photos',
  'media',
  'temp',
  'stories'
]);

const BucketSettingsSchema = z.object({
  public: z.boolean().optional(),
  fileSizeLimit: z.number().optional(),
  allowedMimeTypes: z.array(z.string()).optional()
});

// MARK: - Storage Actions

/**
 * Uploads a file to the specified storage bucket
 */
export const uploadFile = withAuth(async (
  input: UploadFileInput
): Promise<ServerActionResult<UploadResult>> => {
  try {
    const { file, bucket, path, options } = input;
    
    // Validate file
    const validationResult = validateFile(file, bucket)
    if (!validationResult.isValid) {
      return {
        success: false,
        error: validationResult.error,
        data: {
          path: '',
          url: '',
          error: validationResult.error
        }
      }
    }

    const supabase = await createClient()
    
    // Generate unique file path if not provided
    const fileExt = file.name.split('.').pop()
    const fileName = path || `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Upload file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
        contentType: options?.contentType,
        cacheControl: options?.cacheControl || '3600'
      })

    if (error) {
      console.error('Upload error:', error)
      return { 
        success: false,
        error: 'Failed to upload file',
        data: { 
          path: '', 
          url: '', 
          error: 'Failed to upload file' 
        }
      }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return { 
      success: true, 
      data: { 
        path: data.path, 
        url: publicUrl 
      }
    }
  } catch (error) {
      logger.error({
      msg: 'Failed to upload file',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/storage/upload-file'
    })

    return { 
      success: false,
      error: 'Failed to upload file',
      data: { 
        path: '', 
        url: '', 
        error: 'Failed to upload file' 
      }
    }
  }
})

/**
 * Downloads a file from the specified storage bucket
 */
export const downloadFile = withAuth(async (
  input: DownloadFileInput
): Promise<ServerActionResult<Blob | null>> => {
  try {
    const { bucket, path } = input;
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path)

    if (error) {
      logger.error({
        msg: 'Failed to download file',
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        endpoint: '/storage/download-file'
      })
      return { 
        success: false, 
        error: 'Failed to download file',
        data: null 
      }
    }

    return { 
      success: true, 
      data 
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to download file',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/storage/download-file'
    })
    return { 
      success: false, 
      error: 'Failed to download file',
      data: null 
    }
  }
})

/**
 * Creates a signed URL for temporary access to a private file
 */
export const createSignedUrl = withAuth(async (
  input: CreateSignedUrlInput
): Promise<ServerActionResult<string | null>> => {
  try {
    const { bucket, path, expiresIn = 3600 } = input;
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      logger.error({
        msg: 'Failed to create signed URL',
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        endpoint: '/storage/create-signed-url'
      })
      return { 
        success: false, 
        error: 'Failed to create signed URL',
        data: null 
      }
    }
    return { 
      success: true, 
      data: data.signedUrl 
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to create signed URL',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/storage/create-signed-url'
    })
    return { 
      success: false, 
      error: 'Failed to create signed URL',
      data: null 
    }
  }
})

/**
 * Lists all files in a storage bucket directory
 */
export const listFiles = withAuth(async (
  input: ListFilesInput
): Promise<ServerActionResult<{ files: FileObject[], error: string | null }>> => {
  try {
    const { bucket, path } = input;
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path)

    if (error) {
      logger.error({
        msg: 'Failed to list files',
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        endpoint: '/storage/list-files'
      })
      return { 
        success: false, 
        error: 'Failed to list files',
        data: { files: [], error: 'Failed to list files' }
      }
    }
    return { 
      success: true, 
      data: { files: data, error: null }
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to list files',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/storage/list-files'
    })
    return { 
      success: false, 
      error: 'Failed to list files',
      data: { files: [], error: 'Failed to list files' }
    }
  }
})

/**
 * Deletes a file from the specified storage bucket
 */
export const deleteFile = withAuth(async (
  input: DeleteFileInput
): Promise<ServerActionResult<{ success: boolean, error?: string }>> => {
  try {
    const { bucket, paths } = input;
    const supabase = await createClient()
    const { error } = await supabase.storage
      .from(bucket)
      .remove(Array.isArray(paths) ? paths : [paths])

    if (error) {
      logger.error({
        msg: 'Failed to delete file',
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        endpoint: '/storage/delete-file'
      })
      return { 
        success: false, 
        error: 'Failed to delete file',
        data: { success: false, error: 'Failed to delete file' }
      }
    }
    return { 
      success: true, 
      data: { success: true }
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to delete file',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/storage/delete-file'
    })
    return { 
      success: false, 
      error: 'Failed to delete file',
      data: { success: false, error: 'Failed to delete file' }
    }
  }
})

/**
 * Get statistics for a storage bucket
 */
export const getBucketStats = withAuth(async (
  bucket: StorageBucket
): Promise<ServerActionResult<StorageStats>> => {
  const requestId = uuidv4();

  try {
    logger.info({
      msg: `Getting stats for bucket: ${bucket}`,
      requestId,
    });

    // Validate the input
    StorageBucketSchema.parse(bucket);

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('storage', {
      method: 'POST',
      body: {
        operation: 'getBucketStats',
        bucket
      }
    });

    if (error) {
      logger.error({
        msg: 'Error getting bucket stats from Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to get bucket stats'
      };
    }

    logger.info({
      msg: 'Bucket stats retrieved successfully',
      requestId
    });

    return {
      success: true,
      data: data.data as StorageStats
    };
  } catch (error) {
    logger.error({
      msg: 'Error getting bucket stats',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
});

/**
 * Empty a storage bucket
 */
export const emptyBucket = withAuth(async (
  bucket: StorageBucket
): Promise<ServerActionResult<{ message: string }>> => {
  const requestId = uuidv4();

  try {
    logger.info({
      msg: `Emptying bucket: ${bucket}`,
      requestId,
    });

    // Validate the input
    StorageBucketSchema.parse(bucket);

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('storage', {
      method: 'POST',
      body: {
        operation: 'emptyBucket',
        bucket
      }
    });

    if (error) {
      logger.error({
        msg: 'Error emptying bucket via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to empty bucket'
      };
    }

    logger.info({
      msg: 'Bucket emptied successfully',
      requestId
    });

    return {
      success: true,
      data: { message: data.data.message }
    };
  } catch (error) {
    logger.error({
      msg: 'Error emptying bucket',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
});

/**
 * Copy a storage bucket
 */
export const copyBucket = withAuth(async (
  input: { sourceBucket: StorageBucket, targetBucket: StorageBucket }
): Promise<ServerActionResult<{ copied: number }>> => {
  const { sourceBucket, targetBucket } = input;
  const requestId = uuidv4();

  try {
    logger.info({
      msg: `Copying bucket: ${sourceBucket} to ${targetBucket}`,
      requestId,
    });

    // Validate the input
    StorageBucketSchema.parse(sourceBucket);
    StorageBucketSchema.parse(targetBucket);

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('storage', {
      method: 'POST',
      body: {
        operation: 'copyBucket',
        bucket: sourceBucket,
        targetBucket
      }
    });

    if (error) {
      logger.error({
        msg: 'Error copying bucket via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to copy bucket'
      };
    }

    logger.info({
      msg: 'Bucket copied successfully',
      requestId
    });

    return {
      success: true,
      data: { copied: data.data.copied }
    };
  } catch (error) {
    logger.error({
      msg: 'Error copying bucket',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
});

/**
 * Update storage bucket settings
 */
export const updateBucketSettings = withAuth(async (
  input: { 
    bucket: StorageBucket,
    settings: {
      public?: boolean;
      fileSizeLimit?: number;
      allowedMimeTypes?: string[];
    }
  }
): Promise<ServerActionResult<boolean>> => {
  const { bucket, settings } = input;
  const requestId = uuidv4();

  try {
    logger.info({
      msg: `Updating bucket settings: ${bucket}`,
      requestId,
    });

    // Validate the input
    StorageBucketSchema.parse(bucket);
    BucketSettingsSchema.parse(settings);

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { error } = await supabase.functions.invoke('storage', {
      method: 'POST',
      body: {
        operation: 'updateBucketSettings',
        bucket,
        settings
      }
    });

    if (error) {
      logger.error({
        msg: 'Error updating bucket settings via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to update bucket settings'
      };
    }

    logger.info({
      msg: 'Bucket settings updated successfully',
      requestId
    });

    return {
      success: true,
      data: true
    };
  } catch (error) {
    logger.error({
      msg: 'Error updating bucket settings',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
});

/**
 * Create a new storage bucket
 */
export const createBucket = withAuth(async (
  input: { 
    bucket: StorageBucket,
    settings: {
      public?: boolean;
      fileSizeLimit?: number;
      allowedMimeTypes?: string[];
    }
  }
): Promise<ServerActionResult<boolean>> => {
  const { bucket, settings } = input;
  const requestId = uuidv4();

  try {
    logger.info({
      msg: `Creating bucket: ${bucket}`,
      requestId,
    });

    // Validate the input
    StorageBucketSchema.parse(bucket);
    BucketSettingsSchema.parse(settings);

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { error } = await supabase.functions.invoke('storage', {
      method: 'POST',
      body: {
        operation: 'createBucket',
        bucket,
        settings
      }
    });

    if (error) {
      logger.error({
        msg: 'Error creating bucket via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to create bucket'
      };
    }

    logger.info({
      msg: 'Bucket created successfully',
      requestId
    });

    return {
      success: true,
      data: true
    };
  } catch (error) {
    logger.error({
      msg: 'Error creating bucket',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
});

/**
 * Delete a storage bucket
 */
export const deleteBucket = withAuth(async (
  input: { bucket: StorageBucket }
): Promise<ServerActionResult<boolean>> => {
  const { bucket } = input;
  const requestId = uuidv4();

  try {
    logger.info({
      msg: `Deleting bucket: ${bucket}`,
      requestId,
    });

    // Validate the input
    StorageBucketSchema.parse(bucket);

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { error } = await supabase.functions.invoke('storage', {
      method: 'POST',
      body: {
        operation: 'deleteBucket',
        bucket
      }
    });

    if (error) {
      logger.error({
        msg: 'Error deleting bucket via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to delete bucket'
      };
    }

    logger.info({
      msg: 'Bucket deleted successfully',
      requestId
    });

    return {
      success: true,
      data: true
    };
  } catch (error) {
    logger.error({
      msg: 'Error deleting bucket',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
});

/**
 * List all storage buckets
 */
export const listBuckets = withAuth(async (
): Promise<ServerActionResult<string[]>> => {
  const requestId = uuidv4();

  try {
    logger.info({
      msg: 'Listing buckets',
      requestId,
    });

    // Get the Supabase client
    const supabase = await createClient();

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('storage', {
      method: 'POST',
      body: {
        operation: 'listBuckets'
      }
    });

    if (error) {
      logger.error({
        msg: 'Error listing buckets via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      });

      return {
        success: false,
        error: error.message || 'Failed to list buckets'
      };
    }

    logger.info({
      msg: 'Buckets listed successfully',
      requestId
    });

    return {
      success: true,
      data: data.data.buckets.map((bucket: { name: string }) => bucket.name)
    };
  } catch (error) {
    logger.error({
      msg: 'Error listing buckets',
      requestId,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error'
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    };
  }
});

// MARK: - Media Processing Actions

/**
 * Process media using the process-media Edge Function
 */
export const processMedia = withAuth(async (
  input: {
    url: string,
    operations: Array<{
      type: 'resize' | 'compress' | 'convert',
      params: Record<string, unknown>
    }>
  }
): Promise<ServerActionResult<{ processedUrl: string }>> => {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.functions.invoke('process-media', {
      body: {
        url: input.url,
        operations: input.operations
      }
    })

    if (error) {
      logger.error({
        msg: 'Failed to process media',
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error',
        endpoint: '/process-media'
      })
      return { 
        success: false, 
        error: 'Failed to process media',
        data: { processedUrl: '' }
      }
    }

    return {
      success: true,
      data: {
        processedUrl: data?.processedUrl ?? ''
      }
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to process media',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/process-media'
    })
    return { 
      success: false, 
      error: 'Failed to process media',
      data: { processedUrl: '' }
    }
  }
})

/**
 * Upload and process media in a single operation
 */
export const uploadAndProcessMedia = withAuth(async (
  input: {
    file: File,
    bucket: StorageBucket,
    path?: string,
    operations?: Array<{
      type: 'resize' | 'compress' | 'convert',
      params: Record<string, unknown>
    }>,
    options?: {
      upsert?: boolean,
      cacheControl?: string,
      contentType?: string
    }
  }
): Promise<ServerActionResult<{ path: string, url: string, processedUrl?: string }>> => {
  try {
    // First upload the file
    const uploadResult = await uploadFile({
      file: input.file,
      bucket: input.bucket,
      path: input.path,
      options: input.options
    })

    if (!uploadResult.success || !uploadResult.data) {
      return {
        success: false,
        error: uploadResult.error || 'Upload failed',
        data: { path: '', url: '' }
      }
    }

    // If no processing requested, return the upload result
    if (!input.operations || input.operations.length === 0) {
      return {
        success: true,
        data: {
          path: uploadResult.data.path,
          url: uploadResult.data.url
        }
      }
    }

    // Process the uploaded media
    const processResult = await processMedia({
      url: uploadResult.data.url,
      operations: input.operations
    })

    if (!processResult.success || !processResult.data) {
      return {
        success: true,
        error: processResult.error,
        data: {
          path: uploadResult.data.path,
          url: uploadResult.data.url
        }
      }
    }

    // Return both original and processed URLs
    return {
      success: true,
      data: {
        path: uploadResult.data.path,
        url: uploadResult.data.url,
        processedUrl: processResult.data.processedUrl
      }
    }
  } catch (error) {
    logger.error({
      msg: 'Failed to upload and process media',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/upload-and-process-media'
    })
    return { 
      success: false, 
      error: 'Failed to upload and process media',
      data: { path: '', url: '' }
    }
  }
}) 