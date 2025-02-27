/**
 * Client-side storage service
 * 
 * This provides a clean wrapper around Edge Functions for file storage operations.
 * It's designed to be used by components that need file storage functionality.
 */

import { createClient } from '@/lib/supabase'
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
  
  // Create a FormData object for the file upload
  const formData = new FormData()
  formData.append('file', file)
  formData.append('bucket', bucket)
  
  if (path) {
    formData.append('path', path)
  }
  
  if (params.metadata) {
    formData.append('metadata', JSON.stringify(params.metadata))
  }
  
  // Get auth token for edge function call
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  
  // Prepare Edge Function URL
  const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/storage`
    : ''
  
  // Make the request to the Edge Function
  const response = await fetch(FUNCTIONS_URL, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    },
    body: formData
  })
  
  if (!response.ok) {
    const error = await response.json()
    logger.error({
      msg: 'File upload failed',
      error
    })
    throw new Error(error.message || 'File upload failed')
  }
  
  const result = await response.json()
  return result
}

/**
 * Delete a file from storage
 */
export async function deleteFile(params: DeleteFileParams): Promise<boolean> {
  const { url, bucket = 'media' } = params
  
  // Get auth token for edge function call
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  
  // Prepare Edge Function URL
  const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
    ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/storage`
    : ''
  
  // Make the request to the Edge Function
  const response = await fetch(`${FUNCTIONS_URL}?url=${encodeURIComponent(url)}&bucket=${bucket}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  })
  
  if (!response.ok) {
    const error = await response.json()
    logger.error({
      msg: 'File deletion failed',
      error
    })
    throw new Error(error.message || 'File deletion failed')
  }
  
  return true
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
    // Get auth token for edge function call
    const supabase = createClient()
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    
    // Prepare Edge Function URL
    const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
      ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-media`
      : ''
    
    // Call the Edge Function
    const response = await fetch(FUNCTIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        url: uploadResult.url,
        options: {
          type: params.processOptions.type,
          params: {
            quality: params.processOptions.quality || 'medium',
            width: params.processOptions.maxWidth,
            height: params.processOptions.maxHeight,
            format: params.processOptions.format,
            stripMetadata: params.processOptions.stripMetadata !== false,
            ...params.processOptions.customParams
          }
        }
      })
    })
    
    if (!response.ok) {
      throw new Error('Media processing failed')
    }
    
    const result = await response.json()
    
    return {
      ...uploadResult,
      processedUrl: result.data?.processedUrl
    }
  } catch (error) {
    logger.error({
      msg: 'Media processing failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      originalUrl: uploadResult.url
    })
    
    // Return the original upload even if processing failed
    return uploadResult
  }
} 