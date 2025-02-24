import type { Database } from './supabase'

// MARK: - Types
export type RealtimeEventType = 'story' | 'comment' | 'user' | 'presence' | 'connection'
export type RealtimeEventAction = 'INSERT' | 'UPDATE' | 'DELETE' | 'join' | 'leave' | 'create'

export type RealtimeEvent<T = unknown> = {
  type: RealtimeEventType
  action: RealtimeEventAction
  data: T
}

export type StoryEvent = RealtimeEvent<Database['public']['Tables']['stories']['Row']>
export type CommentEvent = RealtimeEvent<Database['public']['Tables']['comments']['Row']>
export type UserEvent = RealtimeEvent<Database['public']['Tables']['users']['Row']>

export type PresenceEvent = RealtimeEvent<{
  userId: string
  status: 'online' | 'offline'
  lastSeen: string
}>

export type ConnectionEvent = RealtimeEvent<{
  status: 'connected' | 'disconnected'
  timestamp: string
}>

// MARK: - Constants
export const REALTIME_CHANNELS = {
  DATABASE: 'database_changes',
  PRESENCE: 'presence',
  STORIES: 'stories',
  COMMENTS: 'comments',
  USERS: 'users'
} as const

export const REALTIME_TABLES = {
  STORIES: 'stories',
  COMMENTS: 'comments',
  USERS: 'users'
} as const 