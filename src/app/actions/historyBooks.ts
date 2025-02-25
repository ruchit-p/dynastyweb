"use server"

import { z } from "zod"
import { createClient } from '@/lib/server/supabase'
import { withAuth } from "./auth"
import { revalidatePath } from 'next/cache'
import { getUserId } from './auth'
import type { HistoryBook } from '@/lib/shared/types/story'
import type { Story } from '@/lib/shared/types/story'

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

// MARK: - Types
export type CreateHistoryBookInput = z.infer<typeof CreateHistoryBookSchema>
export type UpdateHistoryBookInput = z.infer<typeof UpdateHistoryBookSchema>

// Create a new history book
export const createHistoryBook = withAuth(async (input: CreateHistoryBookInput) => {
  try {
    // Validate input
    CreateHistoryBookSchema.parse(input)
    
    const userId = await getUserId()
    if (!userId) {
      return { error: 'Not authenticated' }
    }

    const supabase = createClient()
    
    // Get the user's family tree ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('family_tree_id')
      .eq('id', userId)
      .single()

    if (userError) {
      console.error('Error getting user family tree:', userError)
      return { error: userError.message }
    }

    if (!userData.family_tree_id) {
      return { error: 'User does not have a family tree' }
    }

    // Get viewers (family members)
    const { data: familyMembers, error: membersError } = await supabase
      .from('family_tree_access')
      .select('user_id')
      .eq('family_tree_id', userData.family_tree_id)

    if (membersError) {
      console.error('Error getting family members:', membersError)
      return { error: membersError.message }
    }

    const viewers = familyMembers.map(member => member.user_id)
    
    // Insert the history book
    const { data: historyBook, error } = await supabase
      .from('history_books')
      .insert({
        name: input.name,
        description: input.description || '',
        owner_id: userId,
        privacy_level: input.privacyLevel,
        data_retention_period: input.dataRetentionPeriod,
        viewers: viewers,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating history book:', error)
      return { error: error.message }
    }

    // Revalidate the history books page
    revalidatePath('/history-book')
    
    return { success: true, historyBook }
  } catch (error) {
    console.error('Error creating history book:', error)
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    return { error: 'Failed to create history book' }
  }
})

// Update a history book
export const updateHistoryBook = withAuth(async (input: UpdateHistoryBookInput) => {
  try {
    // Validate input
    UpdateHistoryBookSchema.parse(input)
    
    const userId = await getUserId()
    if (!userId) {
      return { error: 'Not authenticated' }
    }

    const supabase = createClient()
    
    // Verify history book ownership
    const { data: existingBook, error: fetchError } = await supabase
      .from('history_books')
      .select('owner_id')
      .eq('id', input.id)
      .single()

    if (fetchError || !existingBook) {
      return { error: 'History book not found' }
    }

    if (existingBook.owner_id !== userId) {
      return { error: 'Not authorized to update this history book' }
    }

    // Update the history book
    const updateData: Partial<HistoryBook> = {}
    if (input.name) updateData.name = input.name
    if (input.description !== undefined) updateData.description = input.description
    if (input.privacyLevel) updateData.privacy_level = input.privacyLevel
    if (input.dataRetentionPeriod) updateData.data_retention_period = input.dataRetentionPeriod
    updateData.updated_at = new Date().toISOString()

    const { data: historyBook, error } = await supabase
      .from('history_books')
      .update(updateData)
      .eq('id', input.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating history book:', error)
      return { error: error.message }
    }

    // Revalidate the history books page
    revalidatePath('/history-book')
    
    return { success: true, historyBook }
  } catch (error) {
    console.error('Error updating history book:', error)
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    return { error: 'Failed to update history book' }
  }
})

// Delete a history book
export const deleteHistoryBook = withAuth(async (id: string) => {
  try {
    if (!id) {
      return { error: 'History book ID is required' }
    }
    
    const userId = await getUserId()
    if (!userId) {
      return { error: 'Not authenticated' }
    }

    const supabase = createClient()
    
    // Verify history book ownership
    const { data: existingBook, error: fetchError } = await supabase
      .from('history_books')
      .select('owner_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingBook) {
      return { error: 'History book not found' }
    }

    if (existingBook.owner_id !== userId) {
      return { error: 'Not authorized to delete this history book' }
    }

    // Delete the history book
    const { error } = await supabase
      .from('history_books')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting history book:', error)
      return { error: error.message }
    }

    // Revalidate the history books page
    revalidatePath('/history-book')
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting history book:', error)
    return { error: 'Failed to delete history book' }
  }
})

/**
 * Get the history books for the current user
 */
export async function getUserHistoryBooks(): Promise<HistoryBook[]> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return []
    }

    const supabase = createClient()
    
    // Get user's family tree ID first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('family_tree_id')
      .eq('id', userId)
      .single()

    if (userError || !userData?.family_tree_id) {
      console.error('Error fetching user family tree:', userError)
      return []
    }

    // Get all history books owned by the user or family history books in their family tree
    const { data, error } = await supabase
      .from('history_books')
      .select('*')
      .or(`owner_id.eq.${userId},and(privacy_level.eq.family,family_tree_id.eq.${userData.family_tree_id})`)

    if (error) {
      console.error('Error fetching history books:', error)
      return []
    }

    return data as unknown as HistoryBook[]
  } catch (error) {
    console.error('Error fetching history books:', error)
    return []
  }
}

/**
 * Get a specific history book by ID, respecting privacy settings
 */
export async function getHistoryBook(id: string): Promise<HistoryBook | null> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return null
    }

    const supabase = createClient()
    
    // First check if the user has access to this history book
    const { data: hasAccess, error: accessError } = await supabase
      .rpc('user_has_history_book_access', {
        p_history_book_id: id,
        p_user_id: userId
      })

    if (accessError) {
      console.error('Error checking history book access:', accessError)
      return null
    }

    if (!hasAccess) {
      console.error('User does not have access to this history book')
      return null
    }

    // Get the history book
    const { data, error } = await supabase
      .from('history_books')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching history book:', error)
      return null
    }

    return data as unknown as HistoryBook
  } catch (error) {
    console.error('Error fetching history book:', error)
    return null
  }
}

/**
 * Get all stories in a history book that the user can access
 */
export async function getHistoryBookStories(historyBookId: string): Promise<Story[]> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return []
    }

    const supabase = createClient()
    
    // Use the database function to get all accessible stories in this history book
    const { data, error } = await supabase
      .rpc('get_accessible_history_book_stories', {
        p_history_book_id: historyBookId,
        p_user_id: userId
      })

    if (error) {
      console.error('Error fetching history book stories:', error)
      
      // Fallback query if the RPC function is not yet available
      // Get the history book first to check its privacy level
      const { data: historyBook, error: historyBookError } = await supabase
        .from('history_books')
        .select('privacy_level, owner_id')
        .eq('id', historyBookId)
        .single()
        
      if (historyBookError) {
        console.error('Error fetching history book:', historyBookError)
        return []
      }
      
      // If history book is personal and user is not the owner, return empty array
      if (historyBook.privacy_level === 'personal' && historyBook.owner_id !== userId) {
        return []
      }
      
      // If history book is personal and user is the owner, return all stories in the history book
      if (historyBook.privacy_level === 'personal' && historyBook.owner_id === userId) {
        const { data: stories, error: storiesError } = await supabase
          .from('stories')
          .select('*')
          .in('id', (
            supabase
              .from('history_book_stories')
              .select('story_id')
              .eq('history_book_id', historyBookId)
          ))
          
        if (storiesError) {
          console.error('Error fetching stories:', storiesError)
          return []
        }
        
        return stories as unknown as Story[]
      }
      
      // If history book is family, respect individual story privacy settings
      const { data: stories, error: storiesError } = await supabase
        .from('stories')
        .select('*')
        .in('id', (
          supabase
            .from('history_book_stories')
            .select('story_id')
            .eq('history_book_id', historyBookId)
        ))
        .or(`user_id.eq.${userId},privacy_level.eq.family,and(privacy_level.eq.custom,custom_access_members.cs.{${userId}})`)
        
      if (storiesError) {
        console.error('Error fetching stories:', storiesError)
        return []
      }
      
      return stories as unknown as Story[]
    }

    return data as unknown as Story[]
  } catch (error) {
    console.error('Error fetching history book stories:', error)
    return []
  }
} 