"use server"

import { z } from "zod"
import { createClient } from "@/lib/server/supabase"
import { revalidatePath } from 'next/cache'
import type { Story } from '@/lib/shared/types/story'
import { logger } from '@/lib/server/logger'
import { measureAsync } from '@/lib/performance'
import { v4 as uuidv4 } from 'uuid'

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
export async function createStory(formData: FormData) {
  return await measureAsync('actions.stories.createStory', async () => {
    const requestId = uuidv4()
    try {
      // Extract media files from FormData
      const mediaFiles: Array<{
        file: string;
        fileName: string;
        fileType: string;
        compressionOptions?: {
          quality?: number;
          maxWidth?: number;
          maxHeight?: number;
        };
      }> = []
      
      // Check if there are files in the formData
      const files = formData.getAll('file') as File[]
      
      if (files && files.length > 0 && files[0] instanceof File) {
        // Process each file
        for (const file of files) {
          logger.debug({
            msg: 'Processing media file for direct upload with story creation',
            requestId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          })
          
          // Read file as base64
          const fileBuffer = await file.arrayBuffer()
          const fileBase64 = btoa(
            new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          )
          
          // Add to mediaFiles array with compression options
          mediaFiles.push({
            file: fileBase64,
            fileName: file.name,
            fileType: file.type,
            compressionOptions: {
              quality: 85, // Default compression quality
              maxWidth: 1920, // Default max width for images
              maxHeight: 1080 // Default max height for images
            }
          })
        }
        
        // Remove the files from formData as we'll send them separately
        while (formData.has('file')) {
          formData.delete('file')
        }
      }
      
      // Handle FormData input for story data
      const input = Object.fromEntries(formData.entries()) as unknown as CreateStoryInput;
      const validated = CreateStorySchema.parse(input)
      
      logger.debug({
        msg: 'Creating story via Edge Function with integrated media processing - request started',
        requestId,
        title: validated.title,
        familyTreeId: validated.familyTreeId,
        mediaFilesCount: mediaFiles.length
      })
      
      const supabase = await createClient()
      
      // Call the Edge Function with media files included
      const { data, error } = await supabase.functions.invoke('stories/create', {
        method: 'POST',
        body: {
          title: validated.title,
          content: validated.content || '',
          familyTreeId: validated.familyTreeId || '',
          mediaUrls: validated.mediaUrls || [],
          mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
          tags: validated.tags || [],
          privacy: validated.privacy
        }
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function while creating story with media',
          requestId,
          title: validated.title,
          error: error.message,
          status: error.status
        })
        return { error: error.message || 'Failed to create story' }
      }
      
      const story = data?.story
      
      if (!story) {
        logger.error({
          msg: 'No story returned from Edge Function',
          requestId,
          title: validated.title
        })
        return { error: 'Failed to create story' }
      }
      
      // Revalidate cache
      if (validated.familyTreeId) {
        revalidatePath(`/family-trees/${validated.familyTreeId}/stories`)
      }
      revalidatePath('/stories')
      
      logger.info({
        msg: 'Story created successfully via Edge Function with integrated media processing',
        requestId,
        storyId: story.id,
        title: validated.title,
        mediaCount: story.media_urls?.length || 0
      })
      
      return { story }
    } catch (error) {
      logger.error({
        msg: 'Failed to create story with media',
        requestId,
        title: formData.get('title'),
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error)
      })
      
      if (error instanceof z.ZodError) {
        return { error: 'Invalid input data' }
      }
      
      return { error: 'Failed to create story' }
    }
  })
}

// Update a story
export async function updateStory(formData: FormData) {
  return await measureAsync('actions.stories.updateStory', async () => {
    const requestId = uuidv4()
    try {
      // Extract media files from FormData
      const mediaFiles: Array<{
        file: string;
        fileName: string;
        fileType: string;
        compressionOptions?: {
          quality?: number;
          maxWidth?: number;
          maxHeight?: number;
        };
      }> = []
      
      // Check if there are files in the formData
      const files = formData.getAll('file') as File[]
      
      if (files && files.length > 0 && files[0] instanceof File) {
        // Process each file
        for (const file of files) {
          logger.debug({
            msg: 'Processing media file for direct upload with story update',
            requestId,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type
          })
          
          // Read file as base64
          const fileBuffer = await file.arrayBuffer()
          const fileBase64 = btoa(
            new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
          )
          
          // Add to mediaFiles array with compression options
          mediaFiles.push({
            file: fileBase64,
            fileName: file.name,
            fileType: file.type,
            compressionOptions: {
              quality: 85, // Default compression quality
              maxWidth: 1920, // Default max width for images
              maxHeight: 1080 // Default max height for images
            }
          })
        }
        
        // Remove the files from formData as we'll send them separately
        while (formData.has('file')) {
          formData.delete('file')
        }
      }
      
      // Handle FormData input for story data
      const input = Object.fromEntries(formData.entries()) as unknown as UpdateStoryInput;
      const validated = UpdateStorySchema.parse(input);
        
      logger.debug({
        msg: 'Updating story via Edge Function with integrated media processing - request started',
        requestId,
        storyId: validated.id,
        mediaFilesCount: mediaFiles.length
      })
      
      const supabase = await createClient()
      
      // Call the Edge Function with media files included
      const { data, error } = await supabase.functions.invoke('stories/update', {
        method: 'POST',
        body: {
          id: validated.id,
          title: validated.title,
          content: validated.content,
          mediaUrls: validated.mediaUrls,
          mediaFiles: mediaFiles.length > 0 ? mediaFiles : undefined,
          tags: validated.tags,
          privacy: validated.privacy
        }
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function while updating story with media',
          requestId,
          storyId: validated.id,
          error: error.message,
          status: error.status
        })
        return { error: error.message || 'Failed to update story' }
      }
      
      const story = data?.story
      
      // Revalidate the stories page
      revalidatePath('/stories')
      
      logger.info({
        msg: 'Story updated successfully via Edge Function with integrated media processing',
        requestId,
        storyId: validated.id,
        updateFields: Object.keys(validated).filter(key => key !== 'id'),
        mediaCount: story?.media_urls?.length || 0
      })
      
      return { success: true, story }
    } catch (error) {
      logger.error({
        msg: 'Failed to update story with media',
        requestId,
        storyId: formData.get('id'),
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error)
      })
      
      if (error instanceof z.ZodError) {
        return { error: error.errors[0].message }
      }
      return { error: 'Failed to update story' }
    }
  })
}

// Delete a story
export async function deleteStory(formData: FormData) {
  return await measureAsync('actions.stories.deleteStory', async () => {
    const requestId = uuidv4()
    try {
      // Handle FormData input
      const id = formData.get('id') as string;
        
      if (!id) {
        logger.warn({
          msg: 'Delete story attempted without ID',
          requestId
        })
        return { error: 'Story ID is required' }
      }
      
      logger.debug({
        msg: 'Deleting story via Edge Function - request started',
        requestId,
        storyId: id
      })
      
      const supabase = await createClient()
      
      // Call the Edge Function
      const { error } = await supabase.functions.invoke('stories/delete', {
        method: 'POST',
        body: { id }
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function while deleting story',
          requestId,
          storyId: id,
          error: error.message,
          status: error.status
        })
        return { error: error.message || 'Failed to delete story' }
      }
      
      // Revalidate the stories page
      revalidatePath('/stories')
      
      logger.info({
        msg: 'Story deleted successfully via Edge Function',
        requestId,
        storyId: id
      })
      
      return { success: true }
    } catch (error) {
      logger.error({
        msg: 'Failed to delete story',
        requestId,
        storyId: formData.get('id'),
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error)
      })
      return { error: 'Failed to delete story' }
    }
  })
}

// Add a comment to a story
export async function addComment(formData: FormData) {
  return await measureAsync('actions.stories.addComment', async () => {
    const requestId = uuidv4()
    try {
      // Handle FormData input
      const input = {
        storyId: formData.get('storyId') as string,
        content: formData.get('content') as string
      };
      
      const validated = commentSchema.parse(input);
        
      logger.debug({
        msg: 'Adding comment - request started',
        requestId,
        storyId: validated.storyId
      })
      
      const supabase = await createClient()
      
      logger.debug({
        msg: 'Calling comments Edge Function',
        requestId,
        storyId: validated.storyId,
        contentLength: validated.content.length
      })
      
      // Call the Edge Function to add a comment
      const { data, error } = await supabase.functions.invoke('comments/add', {
        method: 'POST',
        body: {
          storyId: validated.storyId,
          content: validated.content
        }
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function while adding comment',
          requestId,
          error: error.message,
          status: error.status
        })
        
        return { error: error.message || 'Failed to add comment' }
      }
      
      const comment = data.data
      
      logger.info({
        msg: 'Comment added successfully via Edge Function',
        requestId,
        storyId: validated.storyId,
        commentId: comment.id
      })
      
      return { success: true, comment }
    } catch (error) {
      logger.error({
        msg: 'Failed to add comment',
        requestId,
        storyId: formData.get('storyId'),
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error)
      })
      return { error: 'Failed to add comment' }
    }
  })
}

// Get comments for a story
export async function getStoryComments(storyId: string) {
  return await measureAsync('actions.stories.getStoryComments', async () => {
    const requestId = uuidv4()
    try {
      logger.debug({
        msg: 'Fetching story comments - request started',
        requestId,
        storyId
      })
      
      if (!storyId) {
        return { error: 'Story ID is required' }
      }
      
      const supabase = await createClient()
      
      logger.debug({
        msg: 'Calling comments Edge Function to get story comments',
        requestId,
        storyId
      })
      
      // Call the Edge Function to get story comments
      const { data, error } = await supabase.functions.invoke('comments/get-story-comments', {
        method: 'POST',
        body: { storyId }
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function while fetching story comments',
          requestId,
          error: error.message,
          status: error.status
        })
        
        return { error: error.message || 'Failed to get story comments' }
      }
      
      logger.info({
        msg: 'Story comments fetched successfully via Edge Function',
        requestId,
        storyId,
        commentCount: data?.data?.length || 0
      })
      
      return { comments: data.data || [] }
    } catch (error) {
      logger.error({
        msg: 'Failed to get story comments',
        requestId,
        storyId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error)
      })
      return { error: 'Failed to get story comments' }
    }
  })
}

// Get stories for a family tree
export async function getFamilyTreeStories(formData: FormData) {
  return await measureAsync('actions.stories.getFamilyTreeStories', async () => {
    const requestId = uuidv4()
    try {
      // Handle FormData input
      const familyTreeId = formData.get('familyTreeId') as string;
        
      if (!familyTreeId) {
        logger.warn({
          msg: 'Get family tree stories attempted without family tree ID',
          requestId
        })
        return { error: 'Family tree ID is required' }
      }
      
      logger.debug({
        msg: 'Fetching family tree stories via Edge Function - request started',
        requestId,
        familyTreeId
      })
      
      const supabase = await createClient()
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('stories/get-family-tree-stories', {
        method: 'POST',
        body: { familyTreeId }
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function while fetching family tree stories',
          requestId,
          familyTreeId,
          error: error.message,
          status: error.status
        })
        return { error: error.message || 'Failed to fetch stories' }
      }
      
      const stories = data?.stories || []
      
      logger.info({
        msg: 'Family tree stories fetched successfully via Edge Function',
        requestId,
        familyTreeId,
        storiesCount: stories.length
      })
      
      return { success: true, stories }
    } catch (error) {
      logger.error({
        msg: 'Failed to fetch family tree stories',
        requestId,
        familyTreeId: formData.get('familyTreeId'),
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error)
      })
      return { error: 'Failed to fetch stories' }
    }
  })
}

// MARK: - Media Upload
export async function uploadStoryMedia(formData: FormData) {
  return await measureAsync('actions.stories.uploadStoryMedia', async () => {
    const requestId = uuidv4()
    try {
      const file = formData.get('file') as File;
      
      if (!file) {
        logger.warn({
          msg: 'Upload story media attempted without file',
          requestId
        })
        return { error: 'File is required' }
      }
      
      logger.debug({
        msg: 'Uploading story media via Edge Function - request started',
        requestId,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })
      
      // Read file as base64
      const fileBuffer = await file.arrayBuffer()
      const fileBase64 = btoa(
        new Uint8Array(fileBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      )
      
      const supabase = await createClient()
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('stories/upload-media', {
        method: 'POST',
        body: {
          file: fileBase64,
          fileName: file.name,
          fileType: file.type
        }
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function while uploading media',
          requestId,
          fileName: file.name,
          error: error.message,
          status: error.status
        })
        return { error: error.message || 'Failed to upload media' }
      }
      
      const mediaUrl = data?.mediaUrl
      
      if (!mediaUrl) {
        logger.error({
          msg: 'No media URL returned from Edge Function',
          requestId,
          fileName: file.name
        })
        return { error: 'Failed to upload media' }
      }
      
      logger.info({
        msg: 'Story media uploaded successfully via Edge Function',
        requestId,
        fileName: file.name,
        fileSize: file.size,
        mediaUrl
      })
      
      return { success: true, mediaUrl }
    } catch (error) {
      logger.error({
        msg: 'Failed to upload story media',
        requestId,
        fileName: formData.get('file') instanceof File ? (formData.get('file') as File).name : 'unknown',
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error)
      })
      return { error: 'Failed to upload media' }
    }
  })
}

// MARK: - Story Management

/**
 * Fetches a list of stories for a specific user
 * @returns A list of stories
 */
export async function getUserStories(): Promise<Story[]> {
  return await measureAsync('actions.stories.getUserStories', async () => {
    const requestId = uuidv4()
    try {
      logger.debug({
        msg: 'Fetching user stories via Edge Function - request started',
        requestId
      })
      
      const supabase = await createClient()
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('stories/get-user-stories', {
        method: 'POST',
        body: {}
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function while fetching user stories',
          requestId,
          error: error.message,
          status: error.status
        })
        return []
      }
      
      const stories = data?.stories || []
      
      logger.info({
        msg: 'User stories fetched successfully via Edge Function',
        requestId,
        storiesCount: stories.length
      })
      
      return stories as Story[]
    } catch (error) {
      logger.error({
        msg: 'Failed to fetch user stories',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error)
      })
      return []
    }
  })
}

/**
 * Fetches a list of stories that a user can access
 * @returns A list of stories that the user can access
 */
export async function getAccessibleStories(): Promise<Story[]> {
  return await measureAsync('actions.stories.getAccessibleStories', async () => {
    const requestId = uuidv4()
    try {
      logger.debug({
        msg: 'Fetching accessible stories via Edge Function - request started',
        requestId
      })
      
      const supabase = await createClient()
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('stories/get-accessible-stories', {
        method: 'POST',
        body: {}
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function while fetching accessible stories',
          requestId,
          error: error.message,
          status: error.status
        })
        return []
      }
      
      const stories = data?.stories || []
      
      logger.info({
        msg: 'Accessible stories fetched successfully via Edge Function',
        requestId,
        storiesCount: stories.length
      })
      
      return stories as Story[]
    } catch (error) {
      logger.error({
        msg: 'Failed to fetch accessible stories',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error)
      })
      return []
    }
  })
} 