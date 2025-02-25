"use server"

import { z } from "zod"
import { createClient } from "@/lib/server/supabase"
import { withAuth } from "./auth"
import { revalidatePath } from 'next/cache'
import { StoriesRepository } from '@/lib/server/repositories/stories'
import type { Database } from '@/lib/shared/types/supabase'
import type { Story, StoryMetaData } from '@/lib/shared/types/story'
import { notFound, redirect } from 'next/navigation'
import { getUserId } from './auth'

// Input validation schemas
const CreateStorySchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().optional(),
  familyTreeId: z.string().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  privacy: z.enum(['family', 'personal', 'custom']).default('family'),
})

const UpdateStorySchema = z.object({
  id: z.string().min(1, "Story ID is required"),
  title: z.string().min(1, "Title is required").optional(),
  content: z.string().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
  privacy: z.enum(['family', 'personal', 'custom']).optional(),
})

const commentSchema = z.object({
  storyId: z.string().uuid(),
  content: z.string().min(1),
})

// MARK: - Types
export type CreateStoryInput = z.infer<typeof CreateStorySchema>
export type UpdateStoryInput = z.infer<typeof UpdateStorySchema>

// Create a new story
export const createStory = withAuth(async (input: CreateStoryInput) => {
  try {
    const validated = CreateStorySchema.parse(input)
    const supabase = await createClient()
    const repository = new StoriesRepository(supabase)
    
    const userId = await getUserId()
    if (!userId) {
      return { error: 'Not authenticated' }
    }

    // Insert the story
    const { data: story, error } = await supabase
      .from('stories')
      .insert({
        title: validated.title,
        content: validated.content,
        user_id: userId,
        family_tree_id: validated.familyTreeId,
        media_urls: validated.mediaUrls,
        tags: validated.tags,
        privacy_level: validated.privacy,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating story:', error)
      return { error: error.message }
    }

    // Revalidate the stories page
    revalidatePath('/stories')
    
    return { success: true, story }
  } catch (error) {
    console.error('Error creating story:', error)
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    return { error: 'Failed to create story' }
  }
})

// Update a story
export const updateStory = withAuth(async (input: UpdateStoryInput) => {
  try {
    const validated = UpdateStorySchema.parse(input)
    const supabase = await createClient()
    const repository = new StoriesRepository(supabase)
    
    const userId = await getUserId()
    if (!userId) {
      return { error: 'Not authenticated' }
    }

    // Verify story ownership
    const { data: existingStory, error: fetchError } = await supabase
      .from('stories')
      .select('user_id')
      .eq('id', validated.id)
      .single()

    if (fetchError || !existingStory) {
      return { error: 'Story not found' }
    }

    if (existingStory.user_id !== userId) {
      return { error: 'Not authorized to update this story' }
    }

    // Update the story
    const updateData: Partial<Story> = {}
    if (validated.title) updateData.title = validated.title
    if (validated.content !== undefined) updateData.content = validated.content
    if (validated.mediaUrls) updateData.media_urls = validated.mediaUrls
    if (validated.tags) updateData.tags = validated.tags
    if (validated.privacy) updateData.privacy_level = validated.privacy

    const { data: story, error } = await supabase
      .from('stories')
      .update(updateData)
      .eq('id', validated.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating story:', error)
      return { error: error.message }
    }

    // Revalidate the stories page
    revalidatePath('/stories')
    
    return { success: true, story }
  } catch (error) {
    console.error('Error updating story:', error)
    if (error instanceof z.ZodError) {
      return { error: error.errors[0].message }
    }
    return { error: 'Failed to update story' }
  }
})

// Delete a story
export const deleteStory = withAuth(async (id: string) => {
  try {
    if (!id) {
      return { error: 'Story ID is required' }
    }
    
    const supabase = await createClient()
    const repository = new StoriesRepository(supabase)
    
    // Verify story ownership
    const { data: existingStory, error: fetchError } = await supabase
      .from('stories')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !existingStory) {
      return { error: 'Story not found' }
    }

    const userId = await getUserId()
    if (!userId) {
      return { error: 'Not authenticated' }
    }

    if (existingStory.user_id !== userId) {
      return { error: 'Not authorized to delete this story' }
    }

    // Soft delete the story
    const { error } = await supabase
      .from('stories')
      .update({ is_deleted: true })
      .eq('id', id)

    if (error) {
      console.error('Error deleting story:', error)
      return { error: error.message }
    }

    // Revalidate the stories page
    revalidatePath('/stories')
    
    return { success: true }
  } catch (error) {
    console.error('Error deleting story:', error)
    return { error: 'Failed to delete story' }
  }
})

// Add a comment to a story
export const addComment = withAuth(async (input: z.infer<typeof commentSchema>) => {
  try {
    const validated = commentSchema.parse(input)
    const supabase = await createClient()
    const repository = new StoriesRepository(supabase)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    const comment = await repository.addComment(
      validated.storyId,
      user.id,
      validated.content
    )

    return { success: true, comment }
  } catch (error) {
    console.error('Add comment error:', error)
    return { error: 'Failed to add comment' }
  }
})

// Get stories for a family tree
export const getFamilyTreeStories = withAuth(async (familyTreeId: string) => {
  try {
    const supabase = await createClient()
    const repository = new StoriesRepository(supabase)
    
    const stories = await repository.getByFamilyTreeId(familyTreeId)
    return { success: true, stories }
  } catch (error) {
    console.error('Error fetching family stories:', error)
    return { error: 'Failed to fetch stories' }
  }
})

// MARK: - Media Upload
export const uploadStoryMedia = withAuth(async (file: File) => {
  try {
    const supabase = await createClient()
    const repository = new StoriesRepository(supabase)
    
    const mediaUrl = await repository.uploadMedia(file)
    return { success: true, mediaUrl }
  } catch (error) {
    console.error('Error uploading media:', error)
    return { error: 'Failed to upload media' }
  }
})

// MARK: - Story Management

/**
 * Fetches a list of stories for a specific user
 * @returns A list of stories
 */
export async function getUserStories(): Promise<Story[]> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return []
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', userId)

    if (error) {
      console.error('Error fetching stories:', error)
      return []
    }

    return data as unknown as Story[]
  } catch (error) {
    console.error('Error fetching stories:', error)
    return []
  }
}

/**
 * Fetches a list of stories that a user can access
 * @returns A list of stories that the user can access
 */
export async function getAccessibleStories(): Promise<Story[]> {
  try {
    const userId = await getUserId()
    if (!userId) {
      return []
    }

    const supabase = await createClient()
    
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

    const familyTreeId = userData.family_tree_id

    // Fetch all stories this user can access based on the privacy rules
    const { data, error } = await supabase.rpc('get_accessible_stories', {
      p_user_id: userId,
      p_family_tree_id: familyTreeId
    })

    if (error) {
      console.error('Error fetching stories:', error)
      
      // Fallback query if the RPC function is not yet available
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('stories')
        .select('*')
        .or(`user_id.eq.${userId},and(privacy_level.eq.family,family_tree_id.eq.${familyTreeId}),and(privacy_level.eq.custom,custom_access_members.cs.{${userId}})`)
      
      if (fallbackError) {
        console.error('Error in fallback query:', fallbackError)
        return []
      }
      
      return fallbackData as unknown as Story[]
    }

    return data as unknown as Story[]
  } catch (error) {
    console.error('Error fetching stories:', error)
    return []
  }
} 