import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/shared/types/supabase'
import { toast } from '@/components/ui/use-toast'

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
  bucket?: string
  path?: string
  processOptions?: MediaProcessingOptions
  onProgress?: (progress: number) => void
}

// MARK: - Media Operations
export async function uploadMedia(
  file: File,
  options: UploadOptions = {}
): Promise<string> {
  const supabase = createClientComponentClient<Database>()
  const {
    bucket = 'media',
    path = '',
    processOptions,
    onProgress
  } = options

  try {
    // Process media if options provided
    let processedFile = file
    if (processOptions) {
      processedFile = await processMediaBeforeUpload(file, processOptions)
    }

    // Generate unique file name
    const fileExt = file.name.split('.').pop()
    const fileName = `${path}${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`

    // Upload file
    const { error: uploadError, data } = await supabase.storage
      .from(bucket)
      .upload(fileName, processedFile, {
        onUploadProgress: ({ count, total }) => {
          const progress = (count / total) * 100
          onProgress?.(progress)
        }
      })

    if (uploadError) throw uploadError

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName)

    return publicUrl
  } catch (error: any) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error.message || 'Failed to upload media',
    })
    throw error
  }
}

export async function deleteMedia(url: string, bucket = 'media'): Promise<void> {
  const supabase = createClientComponentClient<Database>()

  try {
    const path = url.split('/').pop()
    if (!path) throw new Error('Invalid media URL')

    const { error } = await supabase.storage
      .from(bucket)
      .remove([path])

    if (error) throw error

    toast({
      title: 'Success!',
      description: 'Media deleted successfully.',
    })
  } catch (error: any) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error.message || 'Failed to delete media',
    })
    throw error
  }
}

export async function processMedia(
  url: string,
  options: MediaProcessingOptions
): Promise<string> {
  const supabase = createClientComponentClient<Database>()

  try {
    // Call the Edge Function for media processing
    const { data, error } = await supabase.functions.invoke('process-media', {
      body: {
        url,
        operations: [
          {
            type: options.resize ? 'resize' : 'compress',
            params: options.resize || options.compress
          }
        ]
      }
    })

    if (error) throw error

    return data.processedUrl
  } catch (error: any) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: error.message || 'Failed to process media',
    })
    throw error
  }
}

// MARK: - Helper Functions
async function processMediaBeforeUpload(
  file: File,
  options: MediaProcessingOptions
): Promise<File> {
  // Create canvas for image processing
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to get canvas context')

  // Load image
  const img = new Image()
  const loadImage = new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('Failed to load image'))
    img.src = URL.createObjectURL(file)
  })
  await loadImage

  // Apply resize if specified
  if (options.resize) {
    const { width = img.width, height = img.height, fit = 'cover' } = options.resize
    canvas.width = width
    canvas.height = height

    if (fit === 'cover') {
      const scale = Math.max(width / img.width, height / img.height)
      const scaledWidth = img.width * scale
      const scaledHeight = img.height * scale
      const x = (width - scaledWidth) / 2
      const y = (height - scaledHeight) / 2
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
    } else if (fit === 'contain') {
      const scale = Math.min(width / img.width, height / img.height)
      const scaledWidth = img.width * scale
      const scaledHeight = img.height * scale
      const x = (width - scaledWidth) / 2
      const y = (height - scaledHeight) / 2
      ctx.drawImage(img, x, y, scaledWidth, scaledHeight)
    } else {
      ctx.drawImage(img, 0, 0, width, height)
    }
  } else {
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
  }

  // Convert to desired format
  const format = options.compress?.format || file.type.split('/')[1]
  const quality = options.compress?.quality || 0.8
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob!),
      `image/${format}`,
      quality
    )
  })

  // Create new file with processed data
  return new File([blob], file.name, {
    type: `image/${format}`,
    lastModified: Date.now()
  })
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
  ]
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (!allowedTypes.includes(file.type)) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'Invalid file type. Please upload an image or video.',
    })
    return false
  }

  if (file.size > maxSize) {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: 'File too large. Maximum size is 10MB.',
    })
    return false
  }

  return true
} 