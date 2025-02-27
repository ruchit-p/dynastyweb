'use client'

import { useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import { createClient } from '@/lib/supabase'

export type MediaType = 'image' | 'video' | 'audio'
export type QualityLevel = 'high' | 'medium' | 'low'

export type ProcessMediaOptions = {
  type: MediaType
  quality?: QualityLevel
  maxWidth?: number
  maxHeight?: number
  format?: string
  stripMetadata?: boolean
  customParams?: Record<string, unknown>
}

export type ProcessMediaResult = {
  processedUrl: string
  compressionRatio?: string
  originalSize?: number
  processedSize?: number
  duration?: number
  error?: string
}

/**
 * Hook for processing media files using the Edge Function
 */
export function useMediaProcessor() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  /**
   * Process a media file
   * @param url URL of the file to process
   * @param options Processing options
   * @returns ProcessMediaResult with processed URL and stats
   */
  const processMedia = async (
    url: string,
    options: ProcessMediaOptions
  ): Promise<ProcessMediaResult> => {
    try {
      setIsProcessing(true)
      setProgress(0)

      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          // Cap at 90% until actually complete
          return prev < 90 ? prev + 10 : prev
        })
      }, 500)

      // Get auth token for edge function call
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      // Prepare Edge Function URL
      const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-media`
        : ''
      
      // Call the Edge Function
      const response = await fetch(FUNCTIONS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          url,
          options: {
            type: options.type,
            params: {
              format: options.format,
              quality: getQualityValue(options.type, options.quality || 'medium'),
              width: options.maxWidth,
              height: options.maxHeight,
              stripMetadata: options.stripMetadata !== false,
              ...options.customParams
            }
          }
        })
      })

      clearInterval(progressInterval)
      setProgress(100)

      const result = await response.json()

      if (!response.ok || result.error) {
        throw new Error(result.error?.message || 'Failed to process media')
      }

      return result.data || { processedUrl: url }
    } catch (error: unknown) {
      console.error('Media processing error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to process media'
      toast({
        variant: 'destructive',
        title: 'Processing Error',
        description: errorMessage,
      })
      return { processedUrl: url, error: errorMessage }
    } finally {
      setIsProcessing(false)
      setProgress(0)
    }
  }

  /**
   * Get appropriate quality value based on media type and quality level
   */
  const getQualityValue = (type: MediaType, quality: QualityLevel): number | string => {
    if (type === 'image') {
      // Image quality (0-100)
      if (quality === 'high') return 90
      if (quality === 'medium') return 75
      return 60
    } else if (type === 'video') {
      // Video bitrate
      if (quality === 'high') return '2500k'
      if (quality === 'medium') return '1500k'
      return '800k'
    } else {
      // Audio bitrate
      if (quality === 'high') return '256k'
      if (quality === 'medium') return '128k'
      return '96k'
    }
  }

  return {
    processMedia,
    isProcessing,
    progress,
  }
} 