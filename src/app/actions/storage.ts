import { createClient } from '@/lib/server/supabase'
import { withAuth } from './auth'
import { StorageBucket } from '@/lib/shared/types/storage'
import { validateFile } from '@/lib/shared/validation/storage'

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

// MARK: - Storage Actions

/**
 * Uploads a file to the specified storage bucket
 */
export const uploadFile = withAuth(async (
  file: File,
  bucket: StorageBucket,
  path?: string,
  options?: {
    upsert?: boolean,
    cacheControl?: string
  }
): Promise<UploadResult> => {
  try {
    // Validate file
    const validationError = validateFile(file, bucket)
    if (validationError) {
      return {
        path: '',
        url: '',
        error: validationError
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
      return { path: '', url: '', error: 'Failed to upload file' }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return { path: data.path, url: publicUrl }
  } catch (error) {
    console.error('Upload error:', error)
    return { path: '', url: '', error: 'Failed to upload file' }
  }
})

/**
 * Downloads a file from the specified storage bucket
 */
export const downloadFile = withAuth(async (
  bucket: StorageBucket,
  path: string
): Promise<Blob | null> => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path)

    if (error) {
      console.error('Download error:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Download error:', error)
    return null
  }
})

/**
 * Creates a signed URL for temporary access to a private file
 */
export const createSignedUrl = withAuth(async (
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600
): Promise<string | null> => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn)

    if (error) {
      console.error('Signed URL error:', error)
      return null
    }

    return data.signedUrl
  } catch (error) {
    console.error('Signed URL error:', error)
    return null
  }
})

/**
 * Lists all files in a storage bucket directory
 */
export const listFiles = withAuth(async (
  bucket: StorageBucket,
  path?: string,
  options?: {
    limit?: number,
    offset?: number,
    sortBy?: {
      column: string,
      order: 'asc' | 'desc'
    }
  }
) => {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path)

    if (error) {
      console.error('List files error:', error)
      return { files: [], error: 'Failed to list files' }
    }

    return { files: data, error: null }
  } catch (error) {
    console.error('List files error:', error)
    return { files: [], error: 'Failed to list files' }
  }
})

/**
 * Deletes a file from the specified storage bucket
 */
export const deleteFile = withAuth(async (
  bucket: StorageBucket,
  paths: string | string[]
): Promise<{ success: boolean, error?: string }> => {
  try {
    const supabase = await createClient()
    const { error } = await supabase.storage
      .from(bucket)
      .remove(Array.isArray(paths) ? paths : [paths])

    if (error) {
      console.error('Delete error:', error)
      return { success: false, error: 'Failed to delete file' }
    }

    return { success: true }
  } catch (error) {
    console.error('Delete error:', error)
    return { success: false, error: 'Failed to delete file' }
  }
}) 