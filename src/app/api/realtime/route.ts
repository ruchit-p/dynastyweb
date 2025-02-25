import { createClient } from '@/lib/server/supabase'
import { headers } from 'next/headers'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Database } from '@/lib/shared/types/supabase'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

type DatabaseChanges = RealtimePostgresChangesPayload<Database>

const TABLES_TO_WATCH = [
  'stories',
  'users',
  'family_trees',
  'comments',
  'notifications'
] as const

export async function GET() {
  try {
    const headersList = await headers()
    const userId = headersList.get('x-user-id')
    const familyTreeId = headersList.get('x-family-tree-id')

    if (!userId) {
      return new Response('Unauthorized', { status: 401 })
    }

    const supabase = await createClient()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Create a channel with all table subscriptions
          const channel = supabase.channel('db-changes')

          // Add subscriptions for each table
          TABLES_TO_WATCH.forEach((table) => {
            channel.on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table,
                filter: table === 'stories' && familyTreeId 
                  ? `family_tree_id=eq.${familyTreeId}`
                  : undefined
              },
              (payload: DatabaseChanges) => {
                try {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      table,
                      type: payload.eventType,
                      data: payload.new,
                      old: payload.old
                    })}\n\n`)
                  )
                } catch (error) {
                  console.error(`Error processing ${table} change:`, error)
                }
              }
            )
          })

          // Subscribe with error handling
          await channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
              )
            } else if (status === 'CHANNEL_ERROR') {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'error', message: 'Channel error' })}\n\n`)
              )
              throw new Error('Channel subscription error')
            }
          })

          // Keep connection alive
          const interval = setInterval(() => {
            try {
              controller.enqueue(encoder.encode('event: ping\ndata: keep-alive\n\n'))
            } catch (error) {
              console.error('Error sending ping:', error)
            }
          }, 30000)

          // Cleanup on close
          return () => {
            clearInterval(interval)
            channel.unsubscribe()
          }
        } catch (error) {
          console.error('Error in stream setup:', error)
          controller.error(error)
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Error in GET handler:', error)
    return new Response('Internal Server Error', { status: 500 })
  }
} 