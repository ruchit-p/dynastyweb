'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import type { Story } from '@/lib/shared/types/story'
import {
  createStory,
  updateStory,
  deleteStory,
  addComment,
  getFamilyTreeStories,
  uploadStoryMedia,
  getUserStories,
  getAccessibleStories
} from '@/app/actions/stories'
import { supabaseBrowser } from '@/lib/client/supabase-browser'
import { createLogger } from '@/lib/client/logger'

// Create a logger instance for this hook
const logger = createLogger('useStories')

// Define input types for our hook functions
type CreateStoryInput = {
  title: string;
  content?: string;
  familyTreeId?: string;
  mediaUrls?: string[];
  tags?: string[];
  privacy?: 'family' | 'personal' | 'custom';
}

type UpdateStoryInput = {
  id: string;
  title?: string;
  content?: string;
  mediaUrls?: string[];
  tags?: string[];
  privacy?: 'family' | 'personal' | 'custom';
}

type CommentInput = {
  storyId: string;
  content: string;
}

export function useStories() {
  const [isLoading, setIsLoading] = useState(false)
  const [stories, setStories] = useState<Story[]>([])

  // MARK: - Story Operations
  const create = useCallback(async (input: CreateStoryInput) => {
    try {
      setIsLoading(true)
      // @ts-expect-error - Server action typing issue
      const result = await createStory(input)
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive'
        })
        return null
      }
      toast({
        title: 'Success',
        description: 'Story created successfully'
      })
      return result.story
    } catch (error) {
      logger.error('Failed to create story', { 
        error: error instanceof Error ? error.message : String(error),
        title: input.title
      })
      toast({
        title: 'Error',
        description: 'Failed to create story',
        variant: 'destructive'
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const update = useCallback(async (input: UpdateStoryInput) => {
    try {
      setIsLoading(true)
      // @ts-expect-error - Server action typing issue
      const result = await updateStory(input)
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive'
        })
        return null
      }
      toast({
        title: 'Success',
        description: 'Story updated successfully'
      })
      return result.story
    } catch (error) {
      logger.error('Failed to update story', { 
        error: error instanceof Error ? error.message : String(error),
        storyId: input.id
      })
      toast({
        title: 'Error',
        description: 'Failed to update story',
        variant: 'destructive'
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const remove = useCallback(async (id: string) => {
    try {
      setIsLoading(true)
      // @ts-expect-error - Server action typing issue
      const result = await deleteStory(id)
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive'
        })
        return false
      }
      toast({
        title: 'Success',
        description: 'Story deleted successfully'
      })
      return true
    } catch (error) {
      logger.error('Failed to delete story', { 
        error: error instanceof Error ? error.message : String(error),
        storyId: id
      })
      toast({
        title: 'Error',
        description: 'Failed to delete story',
        variant: 'destructive'
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  const comment = useCallback(async (input: CommentInput) => {
    try {
      setIsLoading(true)
      // @ts-expect-error - Server action typing issue
      const result = await addComment(input)
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive'
        })
        return null
      }
      return result.comment
    } catch (error) {
      logger.error('Failed to add comment', { 
        error: error instanceof Error ? error.message : String(error),
        storyId: input.storyId
      })
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive'
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  const uploadMedia = useCallback(async (file: File) => {
    try {
      setIsLoading(true)
      // @ts-expect-error - Server action typing issue
      const result = await uploadStoryMedia(file)
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive'
        })
        return null
      }
      return result.mediaUrl
    } catch (error) {
      logger.error('Failed to upload media', { 
        error: error instanceof Error ? error.message : String(error),
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type
      })
      toast({
        title: 'Error',
        description: 'Failed to upload media',
        variant: 'destructive'
      })
      return null
    } finally {
      setIsLoading(false)
    }
  }, [])

  // MARK: - Story Loading
  const loadFamilyTreeStories = useCallback(async (familyTreeId: string) => {
    try {
      setIsLoading(true)
      // @ts-expect-error - Server action typing issue
      const result = await getFamilyTreeStories(familyTreeId)
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive'
        })
        return []
      }
      setStories(result.stories as Story[])
      return result.stories as Story[]
    } catch (error) {
      logger.error('Failed to load family tree stories', { 
        error: error instanceof Error ? error.message : String(error),
        familyTreeId
      })
      toast({
        title: 'Error',
        description: 'Failed to load stories',
        variant: 'destructive'
      })
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadUserStories = useCallback(async () => {
    try {
      setIsLoading(true)
      // @ts-expect-error - Server action typing issue
      const stories: Story[] = await getUserStories()
      setStories(stories)
      return stories
    } catch (error) {
      logger.error('Failed to load user stories', { 
        error: error instanceof Error ? error.message : String(error)
      })
      toast({
        title: 'Error',
        description: 'Failed to load stories',
        variant: 'destructive'
      })
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadAccessibleStories = useCallback(async () => {
    try {
      setIsLoading(true)
      // @ts-expect-error - Server action typing issue
      const stories: Story[] = await getAccessibleStories()
      setStories(stories)
      return stories
    } catch (error) {
      logger.error('Failed to load accessible stories', { 
        error: error instanceof Error ? error.message : String(error)
      })
      toast({
        title: 'Error',
        description: 'Failed to load stories',
        variant: 'destructive'
      })
      return []
    } finally {
      setIsLoading(false)
    }
  }, [])

  // MARK: - Real-time Updates
  useEffect(() => {
    const channel = supabaseBrowser
      .channel('stories')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stories'
      }, (payload) => {
        // Log real-time update information
        logger.debug('Received database change', {
          eventType: payload.eventType,
          table: payload.table,
          schema: payload.schema,
          recordId: payload.new && typeof payload.new === 'object' && 'id' in payload.new ? payload.new.id : undefined
        })
        
        // Refresh stories on any changes
        if (stories.length > 0) {
          // We need to refresh from the same source we loaded from originally
          // This is just a simple refresh - in a real app, you might want to
          // be more selective about when to refresh
          const firstStory = stories[0]
          if (firstStory.familyTreeId) {
            loadFamilyTreeStories(firstStory.familyTreeId)
          } else if (firstStory.authorID) {
            // If it's a user's story, refresh user stories
            loadUserStories()
          }
        }
      })
      .subscribe((status) => {
        logger.info('Supabase channel status changed', { status })
      })

    logger.info('Subscribed to stories realtime channel')

    return () => {
      logger.info('Unsubscribing from stories realtime channel')
      supabaseBrowser.removeChannel(channel)
    }
  }, [stories, loadFamilyTreeStories, loadUserStories])

  return {
    isLoading,
    stories,
    create,
    update,
    remove,
    comment,
    uploadMedia,
    loadFamilyTreeStories,
    loadUserStories,
    loadAccessibleStories
  }
} 