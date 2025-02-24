'use client'

import { useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'

type RealtimeCallback = (data: any) => void

export function useRealtimeUpdates(callback: RealtimeCallback) {
  const { user } = useAuth()

  const setupEventSource = useCallback(() => {
    if (!user) return

    const eventSource = new EventSource('/api/realtime', {
      withCredentials: true,
    })

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        callback(data)
      } catch (error) {
        console.error('Error parsing SSE data:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('SSE error:', error)
      eventSource.close()
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        setupEventSource()
      }, 5000)
    }

    return () => {
      eventSource.close()
    }
  }, [user, callback])

  useEffect(() => {
    const cleanup = setupEventSource()
    return () => {
      if (cleanup) cleanup()
    }
  }, [setupEventSource])
} 