"use client"

import { useRef, useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import { uploadFile } from '@/app/actions/storage'
import { StorageBucket } from '@/lib/shared/types/storage'

// MARK: - Types
export type MediaUploadProps = {
  type: 'image' | 'video' | 'audio'
  onFileSelect: (url: string) => void
  value?: string
  onRemove?: () => void
  bucket?: StorageBucket
}

const MEDIA_CONFIG = {
  image: {
    accept: '.png,.jpg,.jpeg,.gif,.webp',
    bucket: 'stories' as StorageBucket,
    maxSize: '10MB'
  },
  video: {
    accept: '.mp4,.webm,.mov,.avi',
    bucket: 'stories' as StorageBucket,
    maxSize: '100MB'
  },
  audio: {
    accept: '.mp3,.wav,.m4a,.aac',
    bucket: 'stories' as StorageBucket,
    maxSize: '50MB'
  }
}

export default function MediaUpload({ 
  type, 
  onFileSelect, 
  value, 
  onRemove,
  bucket 
}: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)
  const [isUploading, setIsUploading] = useState(false)
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

      // Upload file
      const { url, error } = await uploadFile(file, targetBucket)

      if (error) {
        throw new Error(error)
      }

      // Update preview
      if (type === 'image') {
        setPreview(url)
      } else {
        setPreview(URL.createObjectURL(file))
      }

      onFileSelect(url)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Upload Error',
        description: error.message || 'Failed to upload file'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleClick = () => {
    inputRef.current?.click()
  }

  const handleRemove = () => {
    setPreview(null)
    if (onRemove) onRemove()
  }

  return (
    <div
      className={`relative border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
        ${isDragging ? 'border-primary bg-primary/10' : 'border-gray-300'}
        ${isUploading ? 'opacity-50 cursor-wait' : ''}`}
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
        disabled={isUploading}
      />

      {preview ? (
        <div className="relative">
          {type === 'image' && (
            <img
              src={preview}
              alt="Preview"
              className="max-w-full h-auto rounded"
            />
          )}
          {type === 'video' && (
            <video
              src={preview}
              controls
              className="max-w-full h-auto rounded"
            />
          )}
          {type === 'audio' && (
            <audio
              src={preview}
              controls
              className="max-w-full"
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
            {isUploading ? (
              'Uploading...'
            ) : (
              <>
                <span className="font-semibold">Click to upload</span> or drag and drop
                <p className="text-xs text-gray-500">
                  {type.toUpperCase()} (max {config.maxSize})
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
} 