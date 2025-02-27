import type { Story } from '@/lib/shared/types/story'
import { createLogger } from '@/lib/client/logger'
import { callEdgeFunction } from '@/lib/api-client'

// Create a logger for story utilities
const storyLogger = createLogger('storyUtils')

// MARK: - Story Validation
export function validateStoryInput(story: Partial<Story>): string[] {
  const errors: string[] = []

  if (!story.title?.trim()) {
    errors.push('Title is required')
  }

  return errors
}

// MARK: - Story Formatting
export function formatStoryDate(date?: string): string {
  if (!date) return ''
  
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  } catch (error) {
    return date
  }
}

// MARK: - Story Access
export function canAccessStory(story: Story, userId: string): boolean {
  // The author of the story always has access
  if (story.user_id === userId || story.authorID === userId) return true
  
  // For family privacy, everyone with access to the family can see
  if (story.privacy_level === 'family' || story.privacy === 'family') return true
  
  // For personal stories, only the author can see
  if (story.privacy_level === 'personal' || story.privacy === 'personal') return false
  
  // For custom access, check if user is in the custom access list
  if (story.privacy_level === 'custom' || story.privacy === 'custom') {
    const members = story.custom_access_members || story.customAccessMembers || []
    return members.includes(userId)
  }
  
  return false
}

// MARK: - Story Preview
export function extractStoryPreview(story: Story): string {
  // If there's content, extract the first 150 characters
  if (story.content) {
    return story.content.substring(0, 150) + (story.content.length > 150 ? '...' : '')
  }
  
  // If there are blocks, find the first text block and extract from that
  if (story.blocks && story.blocks.length > 0) {
    const textBlock = story.blocks.find(block => block.type === 'text')
    if (textBlock && textBlock.content) {
      return textBlock.content.substring(0, 150) + (textBlock.content.length > 150 ? '...' : '')
    }
  }
  
  return 'No preview available'
}

// MARK: - Story Media
export function getStoryMedia(story: Story): string[] {
  const media: string[] = []
  
  // If there are explicit media URLs, use those
  if (story.media_urls && story.media_urls.length > 0) {
    return story.media_urls
  }
  
  // Otherwise, extract media from blocks
  if (story.blocks && story.blocks.length > 0) {
    story.blocks.forEach(block => {
      if (block.type === 'image' || block.type === 'video') {
        media.push(block.content)
      }
    })
  }
  
  return media
}

// MARK: - Story Filtering and Sorting
export function sortStoriesByDate(stories: Story[], order: 'asc' | 'desc' = 'desc'): Story[] {
  return [...stories].sort((a, b) => {
    const dateA = a.event_date || a.eventDate || a.created_at
    const dateB = b.event_date || b.eventDate || b.created_at
    
    if (order === 'asc') {
      return new Date(dateA).getTime() - new Date(dateB).getTime()
    } else {
      return new Date(dateB).getTime() - new Date(dateA).getTime()
    }
  })
}

export function filterStoriesByDateRange(
  stories: Story[], 
  startDate?: Date, 
  endDate?: Date
): Story[] {
  if (!startDate && !endDate) return stories
  
  return stories.filter(story => {
    const storyDate = new Date(story.event_date || story.eventDate || story.created_at)
    
    if (startDate && endDate) {
      return storyDate >= startDate && storyDate <= endDate
    } else if (startDate) {
      return storyDate >= startDate
    } else if (endDate) {
      return storyDate <= endDate
    }
    
    return true
  })
}

export function filterStoriesByAuthor(stories: Story[], authorId: string): Story[] {
  return stories.filter(story => 
    story.user_id === authorId || story.authorID === authorId
  )
}

export function filterStoriesByPrivacy(
  stories: Story[], 
  privacy: 'family' | 'personal' | 'custom'
): Story[] {
  return stories.filter(story => 
    story.privacy_level === privacy || story.privacy === privacy
  )
}

export function searchStories(stories: Story[], query: string): Story[] {
  if (!query.trim()) return stories
  
  const lowerQuery = query.toLowerCase()
  
  return stories.filter(story => {
    // Search in title and subtitle
    if (story.title.toLowerCase().includes(lowerQuery)) return true
    if (story.subtitle && story.subtitle.toLowerCase().includes(lowerQuery)) return true
    
    // Search in content
    if (story.content && story.content.toLowerCase().includes(lowerQuery)) return true
    
    // Search in blocks
    if (story.blocks && story.blocks.length > 0) {
      return story.blocks.some(block => 
        block.type === 'text' && block.content.toLowerCase().includes(lowerQuery)
      )
    }
    
    return false
  })
}

// MARK: - Story Actions
export async function fetchUserStories(): Promise<Story[]> {
  try {
    const response = await callEdgeFunction('/stories/user')
    
    if (!response.data) {
      throw new Error('Failed to fetch user stories')
    }
    
    return response.data.stories
  } catch (error) {
    storyLogger.error('Error fetching user stories', {
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}

export async function fetchAccessibleStories(): Promise<Story[]> {
  try {
    const response = await callEdgeFunction('/stories/accessible')
    
    if (!response.data) {
      throw new Error('Failed to fetch accessible stories')
    }
    
    return response.data.stories
  } catch (error) {
    storyLogger.error('Error fetching accessible stories', {
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}

type ActionResult<T> = { success: true; story: T } | { success: false; error: string }

export async function createNewStory(storyData: Partial<Story>): Promise<ActionResult<Story>> {
  try {
    storyLogger.debug('Creating new story', {
      title: storyData.title,
      authorId: storyData.user_id || storyData.authorID,
      privacy: storyData.privacy || storyData.privacy_level,
      blocksCount: storyData.blocks?.length
    })
    
    // Create a request body for the API
    const requestBody: Record<string, unknown> = {
      title: storyData.title || '',
      subtitle: storyData.subtitle || '',
    }
    
    if (storyData.id) {
      requestBody.id = storyData.id
    }
    
    if (storyData.event_date || storyData.eventDate) {
      requestBody.event_date = storyData.event_date || storyData.eventDate
    }
    
    if (storyData.location) {
      requestBody.location = typeof storyData.location === 'string' 
        ? storyData.location 
        : JSON.stringify(storyData.location)
    }
    
    requestBody.privacy = storyData.privacy || storyData.privacy_level || 'family'
    
    if (storyData.custom_access_members?.length || storyData.customAccessMembers?.length) {
      requestBody.custom_access_members = storyData.custom_access_members || storyData.customAccessMembers
    }
    
    if (storyData.blocks?.length) {
      requestBody.blocks = storyData.blocks
    }
    
    requestBody.family_tree_id = storyData.family_tree_id || storyData.familyTreeId || ''
    
    if (storyData.people_involved?.length || storyData.peopleInvolved?.length) {
      requestBody.people_involved = storyData.people_involved || storyData.peopleInvolved
    }
    
    const response = await callEdgeFunction('/stories', requestBody)
    
    if (response.data?.story) {
      storyLogger.info('Story created successfully', {
        storyId: response.data.story.id,
        authorId: storyData.user_id || storyData.authorID
      })
      return { success: true, story: response.data.story }
    }
    
    storyLogger.warn('Failed to create story', {
      error: response.error || 'Unknown error'
    })
    return { success: false, error: response.error?.message || 'Failed to create story' }
  } catch (error) {
    storyLogger.error('Error creating story', {
      title: storyData.title,
      authorId: storyData.user_id || storyData.authorID,
      error: error instanceof Error ? error.message : String(error)
    })
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

export async function updateExistingStory(storyData: Partial<Story> & { id: string }): Promise<ActionResult<Story>> {
  try {
    storyLogger.debug('Updating story', {
      storyId: storyData.id,
      title: storyData.title
    })
    
    // Create a request body for the API
    const requestBody: Record<string, unknown> = {
      id: storyData.id
    }
    
    if (storyData.title) {
      requestBody.title = storyData.title
    }
    
    if (storyData.subtitle) {
      requestBody.subtitle = storyData.subtitle
    }
    
    if (storyData.event_date || storyData.eventDate) {
      requestBody.event_date = storyData.event_date || storyData.eventDate
    }
    
    if (storyData.location) {
      requestBody.location = typeof storyData.location === 'string' 
        ? storyData.location 
        : JSON.stringify(storyData.location)
    }
    
    if (storyData.privacy || storyData.privacy_level) {
      requestBody.privacy = storyData.privacy || storyData.privacy_level
    }
    
    if (storyData.custom_access_members?.length || storyData.customAccessMembers?.length) {
      requestBody.custom_access_members = storyData.custom_access_members || storyData.customAccessMembers
    }
    
    if (storyData.blocks?.length) {
      requestBody.blocks = storyData.blocks
    }
    
    if (storyData.people_involved?.length || storyData.peopleInvolved?.length) {
      requestBody.people_involved = storyData.people_involved || storyData.peopleInvolved
    }
    
    const response = await callEdgeFunction(`/stories/${storyData.id}`, requestBody)
    
    if (response.data?.story) {
      storyLogger.info('Story updated successfully', {
        storyId: storyData.id
      })
      return { success: true, story: response.data.story }
    }
    
    storyLogger.warn('Failed to update story', {
      storyId: storyData.id,
      error: response.error || 'Unknown error'
    })
    return { success: false, error: response.error?.message || 'Failed to update story' }
  } catch (error) {
    storyLogger.error('Error updating story', {
      storyId: storyData.id,
      error: error instanceof Error ? error.message : String(error)
    })
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

export async function removeStory(storyId: string): Promise<ActionResult<undefined>> {
  try {
    storyLogger.debug('Removing story', {
      storyId
    })
    
    const response = await callEdgeFunction(`/stories/${storyId}`)
    
    if (!response.error) {
      storyLogger.info('Story deleted successfully', {
        storyId
      })
      return { success: true, story: undefined }
    }
    
    storyLogger.warn('Failed to delete story', {
      storyId,
      error: response.error || 'Unknown error'
    })
    return { 
      success: false, 
      error: response.error?.message || 'Failed to delete story'
    }
  } catch (error) {
    storyLogger.error('Error deleting story', {
      storyId,
      error: error instanceof Error ? error.message : String(error)
    })
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

