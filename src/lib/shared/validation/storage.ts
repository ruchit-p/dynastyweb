import { StorageBucket, STORAGE_CONFIG, STORAGE_ERRORS } from '../types/storage'

/**
 * Validates a file against storage bucket constraints
 */
export function validateFile(file: File, bucket: StorageBucket): { isValid: boolean; error?: string } {
  const config = STORAGE_CONFIG[bucket]

  // Check file size
  if (file.size > config.maxSize) {
    return { isValid: false, error: STORAGE_ERRORS.FILE_TOO_LARGE }
  }

  // Check file type
  if (!config.allowedTypes.includes(file.type)) {
    return { isValid: false, error: STORAGE_ERRORS.INVALID_FILE_TYPE }
  }

  return { isValid: true }
}

/**
 * Validates a file path for security
 */
export function validateFilePath(path: string): { isValid: boolean; error?: string } {
  // Check for path traversal attempts
  if (path.includes('..') || path.startsWith('/')) {
    return { isValid: false, error: 'Invalid file path' }
  }

  // Check for invalid characters
  const invalidChars = /[<>:"|?*]/
  if (invalidChars.test(path)) {
    return { isValid: false, error: 'File path contains invalid characters' }
  }

  return { isValid: true }
}

/**
 * Generates a safe file name from the original name
 */
export function sanitizeFileName(fileName: string): string {
  // Remove invalid characters
  let safe = fileName.replace(/[<>:"|?*]/g, '')
  
  // Replace spaces with underscores
  safe = safe.replace(/\s+/g, '_')
  
  // Remove multiple dots
  safe = safe.replace(/\.+/g, '.')
  
  // Ensure the filename is not too long
  const MAX_LENGTH = 255
  if (safe.length > MAX_LENGTH) {
    const ext = safe.split('.').pop() || ''
    safe = safe.slice(0, MAX_LENGTH - ext.length - 1) + '.' + ext
  }
  
  return safe
} 