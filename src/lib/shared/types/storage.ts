// MARK: - Types
export type StorageBucket = 'avatars' | 'stories' | 'documents'

export type StorageConfig = {
  maxSize: number
  allowedTypes: string[]
  cacheControl: string
}

// MARK: - Constants
export const STORAGE_CONFIG: Record<StorageBucket, StorageConfig> = {
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
    allowedTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    cacheControl: '3600',
  },
}

// MARK: - Error Messages
export const STORAGE_ERRORS = {
  FILE_TOO_LARGE: 'File size exceeds the maximum allowed limit',
  INVALID_FILE_TYPE: 'File type is not supported',
  UPLOAD_FAILED: 'Failed to upload file',
  DOWNLOAD_FAILED: 'Failed to download file',
  DELETE_FAILED: 'Failed to delete file',
  LIST_FAILED: 'Failed to list files',
} as const 