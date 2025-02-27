"use client"

import { useRef, useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import { uploadFile } from '@/lib/client/services/storage'
import { StorageBucket } from '@/lib/shared/types/storage'
import { createClient } from '@/lib/supabase'

// MARK: - Types
export type MediaUploadProps = {
  type: 'image' | 'video' | 'audio' | 'all'
  onFileSelect: (url: string) => void
  value?: string
  onRemove?: () => void
  bucket?: StorageBucket
  processMedia?: boolean
  quality?: 'high' | 'medium' | 'low'
  maxWidth?: number
  maxHeight?: number
}

const MEDIA_CONFIG = {
  image: {
    accept: '.png,.jpg,.jpeg,.gif,.webp,.avif',
    bucket: 'media' as StorageBucket,
    maxSize: '10MB'
  },
  video: {
    accept: '.mp4,.webm,.mov,.avi,.mkv',
    bucket: 'media' as StorageBucket,
    maxSize: '100MB'
  },
  audio: {
    accept: '.mp3,.wav,.m4a,.aac,.ogg,.flac',
    bucket: 'media' as StorageBucket,
    maxSize: '50MB'
  },
  all: {
    accept: '.png,.jpg,.jpeg,.gif,.webp,.avif,.mp4,.webm,.mov,.avi,.mkv,.mp3,.wav,.m4a,.aac,.ogg,.flac',
    bucket: 'media' as StorageBucket,
    maxSize: '100MB'
  }
}

// Helper to get media type from file
function getMediaType(file: File): 'image' | 'video' | 'audio' | null {
  const type = file.type.split('/')[0];
  if (type === 'image') return 'image';
  if (type === 'video') return 'video';
  if (type === 'audio') return 'audio';
  
  // Check by extension if mime type is not reliable
  const ext = file.name.split('.').pop()?.toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'avif'].includes(ext || '')) return 'image';
  if (['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '')) return 'video';
  if (['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'].includes(ext || '')) return 'audio';
  
  return null;
}

// Get processing parameters based on quality setting
function getProcessingParams(mediaType: 'image' | 'video' | 'audio', quality: 'high' | 'medium' | 'low', maxWidth?: number, maxHeight?: number) {
  const params: Record<string, unknown> = {};
  
  if (mediaType === 'image') {
    params.format = 'webp'; // WebP for best compression/quality ratio
    
    // Set quality based on setting
    if (quality === 'high') params.quality = 90;
    else if (quality === 'medium') params.quality = 75;
    else params.quality = 60;
    
    // Set max dimensions
    params.width = maxWidth || 1600;
    if (maxHeight) params.height = maxHeight;
    
    // Enable progressive loading
    params.progressiveLoad = true;
    params.stripMetadata = true;
  } 
  else if (mediaType === 'video') {
    // Video bitrate based on quality
    if (quality === 'high') params.videoBitrate = '2500k';
    else if (quality === 'medium') params.videoBitrate = '1500k';
    else params.videoBitrate = '800k';
    
    // Audio bitrate based on quality
    if (quality === 'high') params.audioBitrate = '192k';
    else if (quality === 'medium') params.audioBitrate = '128k';
    else params.audioBitrate = '96k';
    
    // Resolution based on quality and max dimensions
    if (quality === 'high') {
      params.scale = `${maxWidth || 1920}:${maxHeight || 1080}:force_original_aspect_ratio=decrease`;
    } else if (quality === 'medium') {
      params.scale = `${maxWidth || 1280}:${maxHeight || 720}:force_original_aspect_ratio=decrease`;
    } else {
      params.scale = `${maxWidth || 854}:${maxHeight || 480}:force_original_aspect_ratio=decrease`;
    }
    
    params.stripMetadata = true;
  }
  else if (mediaType === 'audio') {
    // Audio bitrate based on quality
    if (quality === 'high') params.audioBitrate = '256k';
    else if (quality === 'medium') params.audioBitrate = '128k';
    else params.audioBitrate = '96k';
    
    params.stripMetadata = true;
  }
  
  return params;
}

export default function MediaUpload({ 
  type, 
  onFileSelect, 
  value, 
  onRemove,
  bucket,
  processMedia = true,
  quality = 'medium',
  maxWidth,
  maxHeight
}: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingMedia, setProcessingMedia] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const config = MEDIA_CONFIG[type]
  const targetBucket = bucket || config.bucket

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true)
    } else if (e.type === 'dragleave') {
      setIsDragging(false)
    }
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const file = files[0]
    
    if (file) {
      await handleFile(file)
    }
  }

  const handleFile = async (file: File) => {
    try {
      setIsUploading(true)
      setUploadProgress(0)

      // Check file type
      const fileExtension = file.name.split('.').pop()?.toLowerCase()
      const isAcceptedType = config.accept
        .split(',')
        .some(ext => ext.includes(fileExtension || ''))

      if (!isAcceptedType) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'File type not supported'
        })
        return
      }

      // Get media type for preview and processing
      const mediaType = getMediaType(file);
      if (!mediaType && type !== 'all') {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'File type not supported'
        })
        return
      }

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          // Cap at 90% until actually complete
          return prev < 90 ? prev + 5 : prev;
        });
      }, 200);

      // Upload file
      const result = await uploadFile({
        file,
        bucket: targetBucket
      })

      // Clear the progress interval and set to 100%
      clearInterval(progressInterval);
      setUploadProgress(100);

      // Get the URL from the result
      const url = result.url || '';
      if (!url) {
        throw new Error('Failed to get upload URL')
      }

      // Process the media if requested
      let finalUrl = url;
      if (processMedia && url) {
        try {
          setProcessingMedia(true);
          
          // Call the Edge Function for media processing
          const fileType = mediaType || 'image'; // Default to image if type is 'all' and couldn't determine
          const processingParams = getProcessingParams(fileType, quality, maxWidth, maxHeight);
          
          // Get auth token for edge function call
          const supabase = createClient()
          const { data: { session } } = await supabase.auth.getSession()
          const token = session?.access_token

          // Prepare Edge Function URL
          const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
            ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-media`
            : ''
          
          const response = await fetch(FUNCTIONS_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              url,
              options: {
                type: fileType,
                params: processingParams
              }
            })
          });
          
          const result = await response.json();
          
          if (!response.ok || result.error) {
            throw new Error(result.error?.message || 'Failed to process media');
          }
          
          finalUrl = result.data?.processedUrl || url;
          
          // Show compression stats if available
          if (result.data?.compressionRatio) {
            toast({
              title: 'Media processed',
              description: `Compressed by ${result.data.compressionRatio}`,
            });
          }
        } catch (processError) {
          console.error('Failed to process media:', processError);
          // Continue with original URL on error
        } finally {
          setProcessingMedia(false);
        }
      }

      // Update preview
      if (mediaType === 'image' || (!mediaType && type === 'all')) {
        setPreview(finalUrl);
      } else {
        // For video and audio, we can use original file for preview
        // but return the processed URL for storage
        setPreview(URL.createObjectURL(file));
      }

      onFileSelect(finalUrl);
    } catch (error: unknown) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: error instanceof Error ? error.message : 'Failed to upload file'
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleRemove = () => {
    setPreview(null)
    if (onRemove) onRemove()
  }

  const getUploadStatus = () => {
    if (processingMedia) return 'Processing media...';
    if (isUploading) return `Uploading... ${Math.round(uploadProgress)}%`;
    return (
      <>
        <span className="font-semibold">Click to upload</span> or drag and drop
        <p className="text-xs text-gray-500">
          {type === 'all' ? 'Media' : type.toUpperCase()} (max {config.maxSize})
        </p>
      </>
    );
  };

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
        ${isDragging ? 'border-primary bg-primary/10' : 'border-gray-300'}
        ${isUploading || processingMedia ? 'opacity-50 cursor-wait' : ''}`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        ref={inputRef}
        type="file"
        accept={config.accept}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        disabled={isUploading || processingMedia}
      />

      {preview ? (
        <div className="relative">
          {/* Render different previews based on media type */}
          {(type === 'image' || (type === 'all' && preview.match(/\.(jpe?g|png|gif|webp|avif)$/i))) && (
            <img
              src={preview}
              alt="Preview"
              className="max-w-full h-auto rounded"
            />
          )}
          {(type === 'video' || (type === 'all' && preview.match(/\.(mp4|webm|mov|avi|mkv)$/i))) && (
            <video
              src={preview}
              controls
              className="max-w-full h-auto rounded"
            />
          )}
          {(type === 'audio' || (type === 'all' && preview.match(/\.(mp3|wav|m4a|aac|ogg|flac)$/i))) && (
            <audio
              src={preview}
              controls
              className="w-full"
            />
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleRemove()
            }}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1
              hover:bg-red-600 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <div className="text-sm text-gray-600">
            {getUploadStatus()}
          </div>
        </div>
      )}
    </div>
  )
} 