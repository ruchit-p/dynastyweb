'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'
import type { Story } from '@/lib/client/utils/storyUtils'
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
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/shared/types/supabase'
import type {
  CreateStoryResponse,
  UpdateStoryResponse,
  DeleteStoryResponse,
  AddCommentResponse,
  GetFamilyTreeStoriesResponse,
  UploadMediaResponse
} from '@/lib/shared/types/stories'

export function useStories() {
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const [isLoading, setIsLoading] = useState(false)
  const [stories, setStories] = useState<Story[]>([])

  // MARK: - Story Operations
  const create = useCallback(async (input: Parameters<typeof createStory>[0]) => {
    try {
      setIsLoading(true)
      const result = await createStory(input) as CreateStoryResponse
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
      console.error('Error creating story:', error)
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

  const update = useCallback(async (input: Parameters<typeof updateStory>[0]) => {
    try {
      setIsLoading(true)
      const result = await updateStory(input) as UpdateStoryResponse
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
      console.error('Error updating story:', error)
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
      const result = await deleteStory(id) as DeleteStoryResponse
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
      console.error('Error deleting story:', error)
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

  const comment = useCallback(async (input: Parameters<typeof addComment>[0]) => {
    try {
      setIsLoading(true)
      const result = await addComment(input) as AddCommentResponse
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
      console.error('Error adding comment:', error)
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
      const result = await uploadStoryMedia(file) as UploadMediaResponse
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
      console.error('Error uploading media:', error)
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
      const result = await getFamilyTreeStories(familyTreeId) as GetFamilyTreeStoriesResponse
      if (result.error) {
        toast({
          title: 'Error',
          description: result.error,
          variant: 'destructive'
        })
        return []
      }
      setStories(result.stories)
      return result.stories
    } catch (error) {
      console.error('Error loading family tree stories:', error)
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

  const loadUserStories = useCallback(async (userId: string) => {
    try {
      setIsLoading(true)
      const stories = await getUserStories(userId)
      setStories(stories)
      return stories
    } catch (error) {
      console.error('Error loading user stories:', error)
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

  const loadAccessibleStories = useCallback(async (userId: string) => {
    try {
      setIsLoading(true)
      const stories = await getAccessibleStories(userId)
      setStories(stories)
      return stories
    } catch (error) {
      console.error('Error loading accessible stories:', error)
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
    const channel = supabase
      .channel('stories')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'stories'
      }, () => {
        router.refresh()
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [supabase, router])

  return {
    stories,
    isLoading,
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