"use server"

import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/server/supabase"
import { withAuth } from "./auth"
import { revalidatePath } from 'next/cache'
import { StoriesRepository } from '@/lib/server/repositories/stories'
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/shared/types/supabase'
import type { Story } from '@/lib/client/utils/storyUtils'

// Input validation schemas
const createStorySchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(1, 'Content is required'),
  familyTreeId: z.string().min(1, 'Family tree ID is required'),
  mediaUrls: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
})

const updateStorySchema = z.object({
  id: z.string().min(1, 'Story ID is required'),
  title: z.string().min(1, 'Title is required').optional(),
  content: z.string().min(1, 'Content is required').optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  tags: z.array(z.string()).optional(),
})

const commentSchema = z.object({
  storyId: z.string().uuid(),
  content: z.string().min(1),
})

// MARK: - Types
export type CreateStoryInput = z.infer<typeof createStorySchema>
export type UpdateStoryInput = z.infer<typeof updateStorySchema>

// Create a new story
export const createStory = withAuth(async (input: CreateStoryInput) => {
  try {
    const validated = createStorySchema.parse(input)
    const supabase = createServerSupabaseClient()
    const repository = new StoriesRepository(supabase)
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Not authenticated' }
    }
    
    const story = await repository.create({
      title: validated.title,
      content: validated.content,
      family_tree_id: validated.familyTreeId,
      author_id: user.id,
      media_urls: validated.mediaUrls || [],
      tags: validated.tags || [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    // Revalidate the stories page
    revalidatePath('/stories')
    revalidatePath(`/family-tree/${validated.familyTreeId}`)
    
    return { success: true, story }
  } catch (error) {
    console.error('Error creating story:', error)
    return { error: 'Failed to create story' }
  }
})

// Update a story
export const updateStory = withAuth(async (input: UpdateStoryInput) => {
  try {
    const validated = updateStorySchema.parse(input)
    const supabase = createServerSupabaseClient()
    const repository = new StoriesRepository(supabase)
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { error: 'Not authenticated' }
    }
    
    const story = await repository.update(validated.id, {
      title: validated.title,
      content: validated.content,
      media_urls: validated.mediaUrls,
      tags: validated.tags,
      updated_at: new Date().toISOString(),
    })

    // Revalidate the stories page
    revalidatePath('/stories')
    revalidatePath(`/family-tree/${story.family_tree_id}`)
    
    return { success: true, story }
  } catch (error) {
    console.error('Error updating story:', error)
    return { error: 'Failed to update story' }
  }
})

// Delete a story
export const deleteStory = withAuth(async (id: string) => {
  try {
    const supabase = createServerSupabaseClient()
    const repository = new StoriesRepository(supabase)
    
    // Get story details before deletion for revalidation
    const story = await repository.getById(id)
    await repository.delete(id)

    // Revalidate the stories page
    if (story) {
      revalidatePath('/stories')
      revalidatePath(`/family-tree/${story.family_tree_id}`)
    }
    
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
    const supabase = createServerSupabaseClient()
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
    const supabase = createServerSupabaseClient()
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
    const supabase = createServerSupabaseClient()
    const repository = new StoriesRepository(supabase)
    
    const mediaUrl = await repository.uploadMedia(file)
    return { success: true, mediaUrl }
  } catch (error) {
    console.error('Error uploading media:', error)
    return { error: 'Failed to upload media' }
  }
})

export async function getUserStories(userId: string): Promise<Story[]> {
  const supabase = createServerComponentClient<Database>({ cookies })

  try {
    const { data: stories, error } = await supabase
      .from('stories')
      .select(`
        *,
        author:author_id(id, full_name, avatar_url),
        tagged_people:story_tags(
          user:user_id(id, full_name)
        )
      `)
      .eq('author_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform the data to match the Story type
    return stories.map(story => ({
      id: story.id,
      title: story.title,
      subtitle: story.subtitle || undefined,
      authorID: story.author_id,
      createdAt: story.created_at,
      eventDate: story.event_date || undefined,
      location: story.location,
      privacy: story.privacy_level,
      customAccessMembers: story.custom_access_members,
      blocks: story.blocks,
      familyTreeId: story.family_tree_id,
      peopleInvolved: story.people_involved,
      isDeleted: story.is_deleted
    }))
  } catch (error) {
    console.error('Error fetching user stories:', error)
    throw error
  }
}

export async function getAccessibleStories(userId: string): Promise<Story[]> {
  const supabase = createServerComponentClient<Database>({ cookies })

  try {
    // First get the user's family tree ID
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('family_tree_id')
      .eq('id', userId)
      .single()

    if (userError) throw userError
    if (!userData?.family_tree_id) {
      throw new Error('User is not part of a family tree')
    }

    const { data: stories, error } = await supabase
      .from('stories')
      .select(`
        *,
        author:author_id(id, full_name, avatar_url),
        tagged_people:story_tags(
          user:user_id(id, full_name)
        )
      `)
      .eq('family_tree_id', userData.family_tree_id)
      .eq('is_deleted', false)
      .or(`privacy_level.eq.family,and(privacy_level.eq.personal,author_id.eq.${userId}),and(privacy_level.eq.custom,custom_access_members.cs.{${userId}})`)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform the data to match the Story type
    return stories.map(story => ({
      id: story.id,
      title: story.title,
      subtitle: story.subtitle || undefined,
      authorID: story.author_id,
      createdAt: story.created_at,
      eventDate: story.event_date || undefined,
      location: story.location,
      privacy: story.privacy_level,
      customAccessMembers: story.custom_access_members,
      blocks: story.blocks,
      familyTreeId: story.family_tree_id,
      peopleInvolved: story.people_involved,
      isDeleted: story.is_deleted
    }))
  } catch (error) {
    console.error('Error fetching accessible stories:', error)
    throw error instanceof Error 
      ? error 
      : new Error('Failed to fetch accessible stories')
  }
} 