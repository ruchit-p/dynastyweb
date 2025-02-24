'use client'

import { useEffect, useCallback, useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import type {
  RealtimeEvent,
  RealtimeEventType,
  RealtimeEventAction,
  StoryEvent,
  CommentEvent,
  UserEvent,
  PresenceEvent
} from '@/lib/shared/types/realtime'
import type { Database } from '@/lib/shared/types/supabase'

// MARK: - Types
type EventHandler<T> = (event: RealtimeEvent<T>) => void
type EventFilter = {
  type?: RealtimeEventType
  action?: RealtimeEventAction
}

type OnlineUser = {
  id: string
  lastSeen: string
}

// MARK: - Hook
export function useRealtime<T>(
  onEvent: EventHandler<T>,
  filter?: EventFilter
) {
  const handleEvent = useCallback((event: RealtimeEvent<T>) => {
    // Apply filters if provided
    if (filter) {
      if (filter.type && event.type !== filter.type) return
      if (filter.action && event.action !== filter.action) return
    }

    // Call the event handler
    onEvent(event)
  }, [onEvent, filter])

  useEffect(() => {
    const eventSource = new EventSource('/api/realtime')

    eventSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as RealtimeEvent<T>
        handleEvent(event)
      } catch (error) {
        console.error('Failed to parse realtime event:', error)
      }
    }

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error)
      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: 'Failed to connect to real-time updates'
      })
      eventSource.close()
    }

    return () => {
      eventSource.close()
    }
  }, [handleEvent])
}

// MARK: - Story Updates
export function useStoryUpdates(
  onUpdate: (story: Database['public']['Tables']['stories']['Row']) => void,
  action?: RealtimeEventAction
) {
  useRealtime<StoryEvent['data']>(
    (event) => onUpdate(event.data),
    { type: 'story', action }
  )
}

// MARK: - Comment Updates
export function useCommentUpdates(
  onUpdate: (comment: Database['public']['Tables']['comments']['Row']) => void,
  action?: RealtimeEventAction
) {
  useRealtime<CommentEvent['data']>(
    (event) => onUpdate(event.data),
    { type: 'comment', action }
  )
}

// MARK: - User Updates
export function useUserUpdates(
  onUpdate: (user: Database['public']['Tables']['users']['Row']) => void,
  action?: RealtimeEventAction
) {
  useRealtime<UserEvent['data']>(
    (event) => onUpdate(event.data),
    { type: 'user', action }
  )
}

// MARK: - Presence Tracking
export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([])

  useRealtime<PresenceEvent['data']>(
    (event) => {
      const { userId, status, lastSeen } = event.data
      
      if (status === 'online') {
        setOnlineUsers(prev => [
          ...prev.filter(u => u.id !== userId),
          { id: userId, lastSeen }
        ])
      } else {
        setOnlineUsers(prev => prev.filter(u => u.id !== userId))
      }
    },
    { type: 'presence' }
  )

  return onlineUsers
} 