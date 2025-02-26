// MARK: - Types
export type StorageBucket = 'profile-photos' | 'media' | 'temp' | 'stories'

export type StorageConfig = {
  maxSize: number
  allowedTypes: string[]
  cacheControl: string
}

// MARK: - Constants
export const STORAGE_CONFIG: Record<StorageBucket, StorageConfig> = {
  'profile-photos': {
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
    cacheControl: '3600',
  },
  stories: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
      // Images
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
      // Videos
      'video/mp4', 'video/webm', 'video/quicktime',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/aac', 'audio/flac', 'audio/x-m4a'
    ],
    cacheControl: '3600',
  },
  temp: {
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
      // Images
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
      // Videos
      'video/mp4', 'video/webm', 'video/quicktime',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/aac', 'audio/flac', 'audio/x-m4a',
      // Documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ],
    cacheControl: '3600',
  },
  media: {
    maxSize: 200 * 1024 * 1024, // 200MB
    allowedTypes: [
      // Images
      'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif',
      // Videos
      'video/mp4', 'video/webm', 'video/quicktime',
      // Audio
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp3', 'audio/aac', 'audio/flac', 'audio/x-m4a'
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