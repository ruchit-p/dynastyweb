import { createClient } from '@/lib/server/supabase'
import { headers } from 'next/headers'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Database } from '@/lib/shared/types/supabase'
import logger from '@/lib/logger'
import { apiPerformanceHandler } from '@/lib/performance'
import { handleError } from '@/lib/error-handler'

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
  const perfHandler = apiPerformanceHandler('GET /api/realtime');
  const headersList = await headers();
  const userId = headersList.get('x-user-id');
  
  try {
    const familyTreeId = headersList.get('x-family-tree-id')

    if (!userId) {
      logger.warn({
        msg: 'Unauthorized realtime access attempt',
        endpoint: '/api/realtime',
        hasUserId: false
      });
      perfHandler.end('error', { error: 'unauthorized' });
      return new Response('Unauthorized', { status: 401 })
    }
    
    logger.debug({
      msg: 'Realtime connection initiated',
      userId,
      familyTreeId: familyTreeId || 'not_provided',
      endpoint: '/api/realtime'
    });

    const supabase = await createClient()
    const encoder = new TextEncoder()

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Create a channel with all table subscriptions
          const channel = supabase.channel('db-changes')
          
          logger.debug({
            msg: 'Creating realtime channel',
            userId,
            channel: 'db-changes'
          });

          // Add subscriptions for each table
          TABLES_TO_WATCH.forEach((table) => {
            const filter = table === 'stories' && familyTreeId 
              ? `family_tree_id=eq.${familyTreeId}`
              : undefined;
              
            logger.debug({
              msg: 'Adding table subscription',
              userId,
              table,
              hasFilter: !!filter
            });
            
            channel.on(
              'postgres_changes',
              {
                event: '*',
                schema: 'public',
                table,
                filter
              },
              (payload: DatabaseChanges) => {
                try {
                  // Safe access to id properties with type checking
                  const newRecordId = payload.new ? (payload.new as Record<string, unknown>)?.id : undefined;
                  const oldRecordId = payload.old ? (payload.old as Record<string, unknown>)?.id : undefined;
                  
                  logger.debug({
                    msg: 'Realtime change received',
                    userId,
                    table,
                    eventType: payload.eventType,
                    recordId: newRecordId || oldRecordId
                  });
                  
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      table,
                      type: payload.eventType,
                      data: payload.new,
                      old: payload.old
                    })}\n\n`)
                  )
                } catch (error) {
                  logger.error({
                    msg: `Error processing realtime change`,
                    userId,
                    table,
                    error: error instanceof Error ? {
                      message: error.message,
                      stack: error.stack,
                      name: error.name
                    } : 'Unknown error'
                  });
                }
              }
            )
          })

          // Subscribe with error handling
          await channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              logger.info({
                msg: 'Realtime channel subscribed',
                userId,
                status
              });
              
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`)
              )
            } else if (status === 'CHANNEL_ERROR') {
              logger.error({
                msg: 'Realtime channel error',
                userId,
                status
              });
              
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
              logger.error({
                msg: 'Error sending ping',
                userId,
                error: error instanceof Error ? {
                  message: error.message,
                  stack: error.stack,
                  name: error.name
                } : 'Unknown error'
              });
            }
          }, 30000)

          // Cleanup on close
          return () => {
            clearInterval(interval)
            channel.unsubscribe()
            logger.debug({
              msg: 'Realtime connection closed',
              userId
            });
          }
        } catch (error) {
          logger.error({
            msg: 'Error in realtime stream setup',
            userId,
            error: error instanceof Error ? {
              message: error.message,
              stack: error.stack,
              name: error.name
            } : 'Unknown error'
          });
          controller.error(error)
        }
      },
    })

    perfHandler.end('success', { userId });
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    await handleError(error instanceof Error ? error : new Error('Unknown error'), { 
      endpoint: '/api/realtime',
      userId: userId || undefined
    });
    
    perfHandler.end('error', { error: 'unhandled_error' });
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
} 