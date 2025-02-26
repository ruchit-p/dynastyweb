'use client'

import { useEffect, useCallback } from 'react'
import { useAuth } from './useAuth'
import { createLogger } from '@/lib/client/logger'

// Create logger for this hook
const logger = createLogger('useRealtimeUpdates')

// Define a proper type for the realtime data
export interface RealtimeData {
  type: string;
  entityId?: string;
  action?: 'create' | 'update' | 'delete';
  data?: Record<string, unknown>;
  timestamp?: string;
  [key: string]: unknown;
}

// Define the callback type with the proper data structure
type RealtimeCallback = (data: RealtimeData) => void

export function useRealtimeUpdates(callback: RealtimeCallback) {
  const { user } = useAuth()

  const setupEventSource = useCallback(() => {
    if (!user) {
      logger.debug('Skipping EventSource setup - no authenticated user')
      return
    }

    logger.info('Setting up EventSource connection', { userId: user.id })
    
    const eventSource = new EventSource('/api/realtime', {
      withCredentials: true,
    })

    eventSource.onopen = () => {
      logger.info('EventSource connection established', { 
        userId: user.id,
        readyState: eventSource.readyState
      })
    }

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RealtimeData
        logger.debug('Received real-time update', { 
          type: data.type,
          action: data.action,
          entityId: data.entityId
        })
        callback(data)
      } catch (error) {
        logger.error('Failed to parse SSE data', { 
          error: error instanceof Error ? error.message : String(error),
          eventData: event.data,
          userId: user.id
        })
      }
    }

    eventSource.onerror = (error) => {
      logger.error('EventSource connection error', { 
        userId: user.id,
        readyState: eventSource.readyState,
        error: error instanceof ErrorEvent ? error.message : 'Unknown error'
      })
      eventSource.close()
      
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        logger.info('Attempting to reconnect to EventSource', { 
          userId: user.id,
          timestamp: new Date().toISOString()
        })
        setupEventSource()
      }, 5000)
    }

    return () => {
      logger.info('Closing EventSource connection', { userId: user.id })
      eventSource.close()
    }
  }, [user, callback])

  useEffect(() => {
    const cleanup = setupEventSource()
    
    return () => {
      if (cleanup) {
        cleanup()
      }
    }
  }, [setupEventSource])
} 