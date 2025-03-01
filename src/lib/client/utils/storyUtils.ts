import type { Story } from '@/lib/shared/types/story'
import { createLogger } from '@/lib/client/logger'
import { api } from '@/lib/api-client'

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
    const response = await api.stories.getUserStories('current')
    
    if (response.error) {
      throw new Error(response.error.message || 'Failed to fetch user stories')
    }
    
    return response.data?.stories || []
  } catch (error) {
    storyLogger.error('Error fetching user stories', {
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}

export async function fetchAccessibleStories(): Promise<Story[]> {
  try {
    const response = await api.stories.getFeed()
    
    if (response.error) {
      throw new Error(response.error.message || 'Failed to fetch accessible stories')
    }
    
    return response.data?.stories || []
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
    
    const response = await api.stories.createStory(requestBody)
    
    if (response.error) {
      throw new Error(response.error.message || 'Failed to create story')
    }
    
    return {
      success: true,
      story: response.data?.story
    }
  } catch (error) {
    storyLogger.error('Error creating story', {
      error: error instanceof Error ? error.message : String(error),
      title: storyData.title || 'Untitled'
    })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }
  }
}

export async function updateExistingStory(storyData: Partial<Story> & { id: string }): Promise<ActionResult<Story>> {
  try {
    storyLogger.debug('Updating story', {
      id: storyData.id,
      title: storyData.title
    })
    
    // Create a request body for the API
    const requestBody: Record<string, unknown> = {
      title: storyData.title || '',
      subtitle: storyData.subtitle || '',
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
    
    if (storyData.family_tree_id || storyData.familyTreeId) {
      requestBody.family_tree_id = storyData.family_tree_id || storyData.familyTreeId
    }
    
    if (storyData.people_involved?.length || storyData.peopleInvolved?.length) {
      requestBody.people_involved = storyData.people_involved || storyData.peopleInvolved
    }
    
    const response = await api.stories.updateStory(storyData.id, requestBody)
    
    if (response.error) {
      throw new Error(response.error.message || 'Failed to update story')
    }
    
    return {
      success: true,
      story: response.data?.story
    }
  } catch (error) {
    storyLogger.error('Error updating story', {
      error: error instanceof Error ? error.message : String(error),
      id: storyData.id,
      title: storyData.title || 'Untitled'
    })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }
  }
}

export async function removeStory(storyId: string): Promise<ActionResult<undefined>> {
  try {
    storyLogger.debug('Removing story', {
      id: storyId
    })
    
    const response = await api.stories.deleteStory(storyId)
    
    if (response.error) {
      throw new Error(response.error.message || 'Failed to delete story')
    }
    
    return {
      success: true,
      story: undefined
    }
  } catch (error) {
    storyLogger.error('Error removing story', {
      error: error instanceof Error ? error.message : String(error),
      id: storyId
    })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred'
    }
  }
}

