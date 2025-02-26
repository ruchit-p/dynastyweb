"use server"

import { z } from "zod"
import { createClient } from '@/lib/server/supabase'
import { withAuth } from "@/lib/server/middleware"
import { revalidatePath } from 'next/cache'
import type { HistoryBook } from '@/lib/shared/types/story'
import type { Story } from '@/lib/shared/types/story'
import { logger } from "@/lib/server/logger"
import { v4 as uuidv4 } from 'uuid'
import { measureAsync } from '@/lib/performance'
import type { ServerAction } from '@/lib/shared/types/actions'

// Input validation schemas
const CreateHistoryBookSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  privacyLevel: z.enum(['family', 'personal']).default('family'),
  dataRetentionPeriod: z.string().default('forever'),
})

const UpdateHistoryBookSchema = z.object({
  id: z.string().min(1, "History book ID is required"),
  name: z.string().min(1, "Name is required").optional(),
  description: z.string().optional(),
  privacyLevel: z.enum(['family', 'personal']).optional(),
  dataRetentionPeriod: z.string().optional(),
})

// Types
export type CreateHistoryBookInput = z.infer<typeof CreateHistoryBookSchema>
export type UpdateHistoryBookInput = z.infer<typeof UpdateHistoryBookSchema>

// MARK: - API Functions that call Supabase Edge Functions

// Create a new history book
export const createHistoryBook: ServerAction<CreateHistoryBookInput, HistoryBook> = withAuth(async (input: CreateHistoryBookInput) => {
  const requestId = uuidv4()
  
  return await measureAsync('createHistoryBook', async () => {
    try {
      logger.info({
        msg: 'Starting history book creation via Edge Function',
        requestId,
        inputFields: Object.keys(input),
      })
      
      // Validate input data
      const validated = CreateHistoryBookSchema.parse(input)
      
      // Get the Supabase client
      const supabase = await createClient()
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('history-books/create', {
        method: 'POST',
        body: validated
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function during history book creation',
          requestId,
          error: error.message,
          status: error.status
        })
        
        return {
          success: false,
          error: error.message || 'Failed to create history book'
        }
      }
      
      logger.info({
        msg: 'History book created successfully via Edge Function',
        requestId
      })
      
      // Revalidate the history books page
      revalidatePath('/history-book')
      
      return {
        success: true,
        data: data.historyBook
      }
    } catch (error) {
      logger.error({
        msg: 'Error creating history book',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error'
      })
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }
    }
  })
})

// Update a history book
export const updateHistoryBook: ServerAction<UpdateHistoryBookInput, HistoryBook> = withAuth(async (input: UpdateHistoryBookInput) => {
  const requestId = uuidv4()
  
  return await measureAsync('updateHistoryBook', async () => {
    try {
      logger.info({
        msg: 'Starting history book update via Edge Function',
        requestId,
        inputFields: Object.keys(input),
      })
      
      // Validate input data
      const validated = UpdateHistoryBookSchema.parse(input)
      
      // Get the Supabase client
      const supabase = await createClient()
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('history-books/update', {
        method: 'POST',
        body: validated
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function during history book update',
          requestId,
          error: error.message,
          status: error.status
        })
        
        return {
          success: false,
          error: error.message || 'Failed to update history book'
        }
      }
      
      logger.info({
        msg: 'History book updated successfully via Edge Function',
        requestId
      })
      
      // Revalidate the history books page
      revalidatePath('/history-book')
      
      return {
        success: true,
        data: data.historyBook
      }
    } catch (error) {
      logger.error({
        msg: 'Error updating history book',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error'
      })
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }
    }
  })
})

// Delete a history book
export const deleteHistoryBook: ServerAction<string, void> = withAuth(async (id: string) => {
  const requestId = uuidv4()
  
  return await measureAsync('deleteHistoryBook', async () => {
    try {
      logger.info({
        msg: 'Starting history book deletion via Edge Function',
        requestId,
        historyBookId: id
      })
      
      if (!id) {
        return { error: 'History book ID is required' }
      }
      
      // Get the Supabase client
      const supabase = await createClient()
      
      // Call the Edge Function
      const { error } = await supabase.functions.invoke('history-books/delete', {
        method: 'POST',
        body: { id }
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function during history book deletion',
          requestId,
          error: error.message,
          status: error.status
        })
        
        return {
          success: false,
          error: error.message || 'Failed to delete history book'
        }
      }
      
      logger.info({
        msg: 'History book deleted successfully via Edge Function',
        requestId
      })
      
      // Revalidate the history books page
      revalidatePath('/history-book')
      
      return { success: true }
    } catch (error) {
      logger.error({
        msg: 'Failed to delete history book',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error'
      })
      return { error: 'Failed to delete history book' }
    }
  })
})

/**
 * Get the history books for the current user
 */
export async function getUserHistoryBooks(): Promise<{ error?: string; historyBooks?: HistoryBook[] }> {
  const requestId = uuidv4()
  
  return await measureAsync('getUserHistoryBooks', async () => {
    try {
      logger.info({
        msg: 'Fetching user history books via Edge Function',
        requestId,
      })
      
      // Get the Supabase client
      const supabase = await createClient()
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('history-books/get-user-books', {
        method: 'POST',
        body: {}
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function while fetching user history books',
          requestId,
          error: error.message,
          status: error.status
        })
        
        return { error: error.message || 'Failed to get user history books' }
      }
      
      logger.info({
        msg: 'User history books fetched successfully via Edge Function',
        requestId,
        bookCount: data?.historyBooks?.length || 0
      })
      
      return { historyBooks: data.historyBooks || [] }
    } catch (error) {
      logger.error({
        msg: 'Failed to get user history books',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error'
      })
      return { error: 'Failed to get user history books' }
    }
  })
}

// Get history book stories
export async function getHistoryBookStories(historyBookId: string): Promise<{ error?: string; stories?: Story[] }> {
  const requestId = uuidv4()
  
  return await measureAsync('getHistoryBookStories', async () => {
    try {
      logger.info({
        msg: 'Fetching history book stories via Edge Function',
        requestId,
        historyBookId
      })
      
      // Get the Supabase client
      const supabase = await createClient()
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('history-books/get-stories', {
        method: 'POST',
        body: { historyBookId }
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function while fetching history book stories',
          requestId,
          error: error.message,
          status: error.status
        })
        
        return { error: error.message || 'Failed to get history book stories' }
      }
      
      logger.info({
        msg: 'History book stories fetched successfully via Edge Function',
        requestId,
        storyCount: data?.stories?.length || 0
      })
      
      return { stories: data.stories || [] }
    } catch (error) {
      logger.error({
        msg: 'Failed to get history book stories',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error'
      })
      return { error: 'Failed to get history book stories' }
    }
  })
} 