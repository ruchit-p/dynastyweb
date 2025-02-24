import { supabase } from './supabase-admin'
import type { StorageBucket } from '../client/storage'

// MARK: - Types

export type StorageStats = {
  totalSize: number
  fileCount: number
  lastModified: Date
}

// MARK: - Admin Functions

/**
 * Gets storage statistics for a bucket
 */
export async function getBucketStats(bucket: StorageBucket): Promise<StorageStats> {
  const { data: files, error } = await supabase.storage
    .from(bucket)
    .list()

  if (error) {
    console.error('Storage stats error:', error)
    throw new Error('Failed to get storage statistics')
  }

  const totalSize = files.reduce((sum, file) => sum + (file.metadata?.size || 0), 0)
  const lastModified = files.reduce((latest, file) => {
    const fileDate = new Date(file.created_at)
    return fileDate > latest ? fileDate : latest
  }, new Date(0))

  return {
    totalSize,
    fileCount: files.length,
    lastModified,
  }
}

/**
 * Empties a storage bucket
 */
export async function emptyBucket(bucket: StorageBucket) {
  const { data: files, error: listError } = await supabase.storage
    .from(bucket)
    .list()

  if (listError) {
    console.error('Empty bucket error (list):', listError)
    throw new Error('Failed to empty bucket')
  }

  if (files.length === 0) {
    return
  }

  const { error: deleteError } = await supabase.storage
    .from(bucket)
    .remove(files.map(file => file.name))

  if (deleteError) {
    console.error('Empty bucket error (delete):', deleteError)
    throw new Error('Failed to empty bucket')
  }
}

/**
 * Copies all files from one bucket to another
 */
export async function copyBucket(
  sourceBucket: StorageBucket,
  targetBucket: StorageBucket
) {
  const { data: files, error: listError } = await supabase.storage
    .from(sourceBucket)
    .list()

  if (listError) {
    console.error('Copy bucket error (list):', listError)
    throw new Error('Failed to copy bucket')
  }

  for (const file of files) {
    const { error: copyError } = await supabase.storage
      .from(sourceBucket)
      .copy(`${file.name}`, `${file.name}`, targetBucket)

    if (copyError) {
      console.error(`Copy bucket error (copy ${file.name}):`, copyError)
      throw new Error('Failed to copy bucket')
    }
  }
}

/**
 * Updates storage bucket settings
 */
export async function updateBucketSettings(
  bucket: StorageBucket,
  settings: {
    public?: boolean
    fileSizeLimit?: number
    allowedMimeTypes?: string[]
  }
) {
  const { error } = await supabase.storage
    .updateBucket(bucket, {
      public: settings.public,
      file_size_limit: settings.fileSizeLimit,
      allowed_mime_types: settings.allowedMimeTypes,
    })

  if (error) {
    console.error('Update bucket settings error:', error)
    throw new Error('Failed to update bucket settings')
  }
}

/**
 * Creates a new storage bucket
 */
export async function createBucket(
  bucket: StorageBucket,
  settings: {
    public?: boolean
    fileSizeLimit?: number
    allowedMimeTypes?: string[]
  }
) {
  const { error } = await supabase.storage
    .createBucket(bucket, {
      public: settings.public,
      file_size_limit: settings.fileSizeLimit,
      allowed_mime_types: settings.allowedMimeTypes,
    })

  if (error) {
    console.error('Create bucket error:', error)
    throw new Error('Failed to create bucket')
  }
}

/**
 * Deletes a storage bucket and all its contents
 */
export async function deleteBucket(bucket: StorageBucket) {
  const { error } = await supabase.storage.deleteBucket(bucket)

  if (error) {
    console.error('Delete bucket error:', error)
    throw new Error('Failed to delete bucket')
  }
}

/**
 * Gets a list of all storage buckets
 */
export async function listBuckets() {
  const { data, error } = await supabase.storage.listBuckets()

  if (error) {
    console.error('List buckets error:', error)
    throw new Error('Failed to list buckets')
  }

  return data
} 