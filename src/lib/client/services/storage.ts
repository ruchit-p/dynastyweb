/**
 * Client-side storage service
 * 
 * This provides a clean wrapper around API client for file storage operations.
 * It's designed to be used by components that need file storage functionality.
 */

import { api } from '@/lib/api-client'
import logger from '@/lib/logger'
import { StorageBucket } from '@/lib/shared/types/storage'

// MARK: - Types
export interface UploadFileParams {
  file: File
  bucket?: StorageBucket
  path?: string
  metadata?: Record<string, string>
}

export interface UploadResult {
  url: string
  path: string
  id: string
  size: number
  metadata?: Record<string, string>
}

export interface DeleteFileParams {
  url: string
  bucket?: StorageBucket
}

// MARK: - Storage Service

/**
 * Upload a file to storage
 */
export async function uploadFile(params: UploadFileParams): Promise<UploadResult> {
  const { file, bucket = 'media', path } = params
  
  try {
    logger.debug({
      msg: 'Uploading file',
      fileName: file.name,
      bucket,
      path: path || 'root',
      size: file.size,
      type: file.type
    })
    
    const response = await api.storage.uploadFile(file, {
      bucket,
      path,
      contentType: file.type,
    })
    
    if (response.error) {
      logger.error({
        msg: 'File upload failed',
        error: response.error.message,
        code: response.error.code
      })
      throw new Error(response.error.message || 'File upload failed')
    }
    
    logger.debug({
      msg: 'File upload successful',
      fileName: file.name,
      hasResult: !!response.data
    })
    
    return response.data as UploadResult
  } catch (error) {
    logger.error({
      msg: 'Unexpected error during file upload',
      error: error instanceof Error ? error.message : String(error),
      fileName: file.name,
      bucket,
      path: path || 'root'
    })
    throw error
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(params: DeleteFileParams): Promise<boolean> {
  const { url, bucket = 'media' } = params
  
  try {
    logger.debug({
      msg: 'Deleting file',
      url: url.substring(0, 20) + '...',
      bucket
    })
    
    // Extract path from URL or use the entire URL as fallback
    const path = url.includes('/') ? url.split('/').pop() || url : url
    
    const response = await api.storage.getPublicUrl(bucket, path)
    
    if (response.error) {
      logger.error({
        msg: 'Failed to resolve file path for deletion',
        error: response.error.message,
        url: url.substring(0, 20) + '...',
        bucket
      })
      throw new Error(response.error.message || 'Failed to resolve file for deletion')
    }
    
    logger.debug({
      msg: 'File deletion successful',
      url: url.substring(0, 20) + '...'
    })
    
    return true
  } catch (error) {
    logger.error({
      msg: 'Unexpected error during file deletion',
      error: error instanceof Error ? error.message : String(error),
      url: url.substring(0, 20) + '...',
      bucket
    })
    throw error
  }
}

/**
 * Upload and process media in one step
 */
export async function uploadAndProcessMedia(params: UploadFileParams & {
  processOptions?: {
    type: 'image' | 'video' | 'audio'
    quality?: 'high' | 'medium' | 'low'
    maxWidth?: number
    maxHeight?: number
    format?: string
    stripMetadata?: boolean
    customParams?: Record<string, unknown>
  }
}): Promise<UploadResult & { processedUrl?: string }> {
  // First upload the file
  const uploadResult = await uploadFile(params)
  
  // If no processing is requested, return upload result
  if (!params.processOptions) {
    return uploadResult
  }
  
  try {
    logger.debug({
      msg: 'Processing media',
      originalUrl: uploadResult.url.substring(0, 20) + '...',
      mediaType: params.processOptions.type,
      quality: params.processOptions.quality || 'medium'
    })
    
    const response = await api.media.uploadAndProcess(params.file, {
      bucket: params.bucket || 'media',
      path: params.path,
      operations: [
        {
          type: params.processOptions.type === 'image' ? 'resize' : 'compress',
          params: {
            quality: params.processOptions.quality || 'medium',
            width: params.processOptions.maxWidth,
            height: params.processOptions.maxHeight,
            format: params.processOptions.format,
            stripMetadata: params.processOptions.stripMetadata !== false,
            ...params.processOptions.customParams
          }
        }
      ]
    })
    
    if (response.error) {
      logger.error({
        msg: 'Media processing failed',
        error: response.error.message,
        originalUrl: uploadResult.url.substring(0, 20) + '...'
      })
      // Return the original upload even if processing failed
      return uploadResult
    }
    
    return {
      ...uploadResult,
      processedUrl: response.data?.processedUrl
    }
  } catch (error) {
    logger.error({
      msg: 'Media processing failed',
      error: error instanceof Error ? error.message : String(error),
      originalUrl: uploadResult.url.substring(0, 20) + '...'
    })
    
    // Return the original upload even if processing failed
    return uploadResult
  }
}

// MARK: - Unified Service Export
export const storageService = {
  uploadFile,
  deleteFile,
  uploadAndProcessMedia
} 