import { supabaseBrowser } from './supabase-browser'

// MARK: - Types

export type UploadOptions = {
  upsert?: boolean
  contentType?: string
  cacheControl?: string
}

export type StorageBucket = 'avatars' | 'stories' | 'documents'

// MARK: - Constants

const STORAGE_CONFIG = {
  avatars: {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    cacheControl: '3600',
  },
  stories: {
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'],
    cacheControl: '3600',
  },
  documents: {
    maxSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    cacheControl: '3600',
  },
}

// MARK: - Error Messages

const ERROR_MESSAGES = {
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit',
  INVALID_FILE_TYPE: 'File type is not supported',
  UPLOAD_FAILED: 'Failed to upload file',
  DOWNLOAD_FAILED: 'Failed to download file',
  DELETE_FAILED: 'Failed to delete file',
  LIST_FAILED: 'Failed to list files',
}

// MARK: - Validation Functions

/**
 * Validates a file against storage bucket constraints
 */
const validateFile = (file: File, bucket: StorageBucket): { isValid: boolean; error?: string } => {
  const config = STORAGE_CONFIG[bucket]

  if (file.size > config.maxSize) {
    return { isValid: false, error: ERROR_MESSAGES.FILE_TOO_LARGE }
  }

  if (!config.allowedTypes.includes(file.type)) {
    return { isValid: false, error: ERROR_MESSAGES.INVALID_FILE_TYPE }
  }

  return { isValid: true }
}

// MARK: - Storage Functions

/**
 * Uploads a file to the specified storage bucket
 */
export async function uploadFile(
  bucket: StorageBucket,
  path: string,
  file: File,
  options: UploadOptions = {}
) {
  const validation = validateFile(file, bucket)
  if (!validation.isValid) {
    throw new Error(validation.error)
  }

  const { data, error } = await supabaseBrowser.storage
    .from(bucket)
    .upload(path, file, {
      upsert: options.upsert ?? false,
      contentType: options.contentType,
      cacheControl: options.cacheControl ?? STORAGE_CONFIG[bucket].cacheControl,
    })

  if (error) {
    console.error('Upload error:', error)
    throw new Error(ERROR_MESSAGES.UPLOAD_FAILED)
  }

  return data
}

/**
 * Downloads a file from the specified storage bucket
 */
export async function downloadFile(bucket: StorageBucket, path: string) {
  const { data, error } = await supabaseBrowser.storage
    .from(bucket)
    .download(path)

  if (error) {
    console.error('Download error:', error)
    throw new Error(ERROR_MESSAGES.DOWNLOAD_FAILED)
  }

  return data
}

/**
 * Gets a public URL for a file in the specified storage bucket
 */
export function getPublicUrl(bucket: StorageBucket, path: string) {
  const { data } = supabaseBrowser.storage
    .from(bucket)
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * Lists all files in a storage bucket directory
 */
export async function listFiles(bucket: StorageBucket, path?: string) {
  const { data, error } = await supabaseBrowser.storage
    .from(bucket)
    .list(path)

  if (error) {
    console.error('List error:', error)
    throw new Error(ERROR_MESSAGES.LIST_FAILED)
  }

  return data
}

/**
 * Deletes a file from the specified storage bucket
 */
export async function deleteFile(bucket: StorageBucket, path: string) {
  const { error } = await supabaseBrowser.storage
    .from(bucket)
    .remove([path])

  if (error) {
    console.error('Delete error:', error)
    throw new Error(ERROR_MESSAGES.DELETE_FAILED)
  }
}

/**
 * Moves a file within or between storage buckets
 */
export async function moveFile(
  fromBucket: StorageBucket,
  fromPath: string,
  toBucket: StorageBucket,
  toPath: string
) {
  // First copy to new location
  const { error: copyError } = await supabaseBrowser.storage
    .from(fromBucket)
    .copy(fromPath, toPath)

  if (copyError) {
    console.error('Move error (copy):', copyError)
    throw new Error('Failed to move file')
  }

  // Then delete from old location
  const { error: deleteError } = await supabaseBrowser.storage
    .from(fromBucket)
    .remove([fromPath])

  if (deleteError) {
    console.error('Move error (delete):', deleteError)
    // Try to cleanup the copied file
    await supabaseBrowser.storage
      .from(toBucket)
      .remove([toPath])
      .catch(console.error)
    throw new Error('Failed to move file')
  }
}

/**
 * Creates a signed URL for temporary access to a private file
 */
export async function createSignedUrl(
  bucket: StorageBucket,
  path: string,
  expiresIn: number = 3600
) {
  const { data, error } = await supabaseBrowser.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) {
    console.error('Signed URL error:', error)
    throw new Error('Failed to create signed URL')
  }

  return data.signedUrl
} 