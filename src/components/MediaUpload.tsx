"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Upload, X } from "lucide-react"
import Image from "next/image"

interface MediaUploadProps {
  type: "image" | "video" | "audio"
  onFileSelect: (file: File) => void
  value?: string
  onRemove?: () => void
}

export default function MediaUpload({ type, onFileSelect, value, onRemove }: MediaUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(value || null)
  const inputRef = useRef<HTMLInputElement>(null)

  const acceptedTypes = {
    image: ".png,.jpg,.jpeg,.gif,.webp",
    video: ".mp4,.webm,.mov,.avi",
    audio: ".mp3,.wav,.m4a,.aac",
  }

  const maxSizes = {
    image: "10MB",
    video: "100MB",
    audio: "50MB"
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true)
    } else if (e.type === "dragleave") {
      setIsDragging(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const file = files[0]
    
    // Check if the file extension matches any of the accepted types
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    const isAcceptedVideo = type === 'video' && 
      ['mp4', 'webm', 'mov', 'avi'].includes(fileExtension || '')
    
    if (file && (file.type.startsWith(type) || isAcceptedVideo)) {
      handleFile(file)
    }
  }

  const handleFile = (file: File) => {
    onFileSelect(file)
    if (type === "image") {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    } else {
      setPreview(URL.createObjectURL(file))
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
      className={`relative border-2 border-dashed rounded-lg p-4 transition-colors ${
        isDragging ? "border-[#0A5C36] bg-[#0A5C36]/5" : "border-gray-300"
      }`}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedTypes[type]}
        className="hidden"
        onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
      />

      {preview ? (
        <div className="relative">
          {type === "image" && (
            <Image
              src={preview}
              alt="Preview"
              width={400}
              height={300}
              className="rounded-lg object-cover"
            />
          )}
          {type === "video" && (
            <video src={preview} controls className="w-full rounded-lg" />
          )}
          {type === "audio" && (
            <audio src={preview} controls className="w-full" />
          )}
          <Button
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div
          className="flex flex-col items-center justify-center py-8 cursor-pointer"
          onClick={handleClick}
        >
          <Upload className="h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600">
            Click to upload or drag and drop
          </p>
          <p className="text-xs text-gray-500 mt-1">
            {type === "image" && `PNG, JPG up to ${maxSizes.image}`}
            {type === "video" && `MP4, WebM, MOV, AVI up to ${maxSizes.video}`}
            {type === "audio" && `MP3, WAV up to ${maxSizes.audio}`}
          </p>
        </div>
      )}
    </div>
  )
} 