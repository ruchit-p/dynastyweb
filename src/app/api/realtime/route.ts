import { createServerSupabaseClient } from '@/lib/server/supabase-admin'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export async function GET() {
  const headersList = headers()
  const userId = headersList.get('x-user-id')

  if (!userId) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createServerSupabaseClient()
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      // Subscribe to story changes
      const channel = supabase
        .channel('db-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'stories',
          },
          (payload) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
            )
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'users',
          },
          (payload) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(payload)}\n\n`)
            )
          }
        )
        .subscribe()

      // Keep connection alive
      const interval = setInterval(() => {
        controller.enqueue(encoder.encode('event: ping\ndata: keep-alive\n\n'))
      }, 30000)

      // Cleanup on close
      return () => {
        clearInterval(interval)
        channel.unsubscribe()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
} 