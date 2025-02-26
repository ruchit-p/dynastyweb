import { createStory, updateStory, deleteStory, getUserStories, getAccessibleStories } from '@/app/actions/stories'
import type { CreateStoryInput, UpdateStoryInput } from '@/app/actions/stories'
import { createLogger } from '@/lib/client/logger'

// Create a logger for story utilities
const logger = createLogger('storyUtils')

export type Story = {
  id: string
  title: string
  subtitle?: string
  authorID: string
  createdAt: string
  eventDate?: string
  location?: {
    lat: number
    lng: number
    address: string
  }
  privacy: 'family' | 'personal' | 'custom'
  customAccessMembers?: string[]
  blocks: Array<{
    type: 'text' | 'image' | 'video' | 'audio'
    data: string
    localId: string
  }>
  familyTreeId: string
  peopleInvolved: string[]
  isDeleted: boolean
}

// MARK: - Story Validation
export function validateStoryInput(story: Partial<Story>): string[] {
  const errors: string[] = []

  if (!story.title?.trim()) {
    errors.push('Title is required')
  }

  if (!story.familyTreeId) {
    errors.push('Family tree ID is required')
  }

  if (story.privacy === 'custom' && (!story.customAccessMembers || story.customAccessMembers.length === 0)) {
    errors.push('Custom access members are required for custom privacy')
  }

  if (story.blocks?.some(block => !block.type || !block.data)) {
    errors.push('All story blocks must have a type and data')
  }

  return errors
}

// MARK: - Story Formatting
export function formatStoryDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// MARK: - Story Privacy
export function canAccessStory(story: Story, userId: string, familyTreeId?: string): boolean {
  if (story.authorID === userId) return true
  if (story.privacy === 'family' && story.familyTreeId === familyTreeId) return true
  if (story.privacy === 'custom' && story.customAccessMembers?.includes(userId)) return true
  return false
}

// MARK: - Story Content
export function extractStoryPreview(story: Story): string {
  const textBlock = story.blocks.find(block => block.type === 'text')
  if (!textBlock) return ''
  
  const text = textBlock.data
  const maxLength = 150
  if (text.length <= maxLength) return text
  
  return text.substring(0, maxLength) + '...'
}

export function getStoryMedia(story: Story): string[] {
  return story.blocks
    .filter(block => ['image', 'video', 'audio'].includes(block.type))
    .map(block => block.data)
}

// MARK: - Story Sorting
export function sortStoriesByDate(stories: Story[], ascending = false): Story[] {
  return [...stories].sort((a, b) => {
    const dateA = new Date(a.createdAt).getTime()
    const dateB = new Date(b.createdAt).getTime()
    return ascending ? dateA - dateB : dateB - dateA
  })
}

// MARK: - Story Filtering
export function filterStoriesByDateRange(stories: Story[], startDate: Date, endDate: Date): Story[] {
  return stories.filter(story => {
    const storyDate = new Date(story.createdAt)
    return storyDate >= startDate && storyDate <= endDate
  })
}

export function filterStoriesByAuthor(stories: Story[], authorId: string): Story[] {
  return stories.filter(story => story.authorID === authorId)
}

export function filterStoriesByPrivacy(stories: Story[], privacy: Story['privacy']): Story[] {
  return stories.filter(story => story.privacy === privacy)
}

// MARK: - Story Search
export function searchStories(stories: Story[], query: string): Story[] {
  const searchTerm = query.toLowerCase()
  return stories.filter(story => 
    story.title.toLowerCase().includes(searchTerm) ||
    story.blocks.some(block => 
      block.type === 'text' && block.data.toLowerCase().includes(searchTerm)
    )
  )
}

// MARK: - Story Actions
export async function fetchUserStories(userId: string): Promise<Story[]> {
  try {
    const stories = await getUserStories(userId)
    return stories
  } catch (error) {
    logger.error('Error fetching user stories', {
      userId,
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}

export async function fetchAccessibleStories(userId: string): Promise<Story[]> {
  try {
    const stories = await getAccessibleStories(userId)
    return stories
  } catch (error) {
    logger.error('Error fetching accessible stories', {
      userId,
      error: error instanceof Error ? error.message : String(error)
    })
    return []
  }
}

type ActionResult<T> = { success: true; story: T } | { error: string }

export async function createNewStory(storyData: Story) {
  try {
    logger.debug('Creating new story', {
      title: storyData.title,
      authorId: storyData.authorID,
      privacy: storyData.privacy,
      blocksCount: storyData.blocks.length
    })
    
    const transformedData: CreateStoryInput = {
      title: storyData.title,
      subtitle: storyData.subtitle || '',
      event_date: storyData.eventDate || null,
      location: storyData.location || null, 
      privacy: storyData.privacy,
      custom_access_members: storyData.customAccessMembers || [],
      blocks: storyData.blocks,
      family_tree_id: storyData.familyTreeId,
      people_involved: storyData.peopleInvolved || []
    }
    
    const result = await createStory(transformedData)
    
    if (result.success) {
      logger.info('Story created successfully', { 
        storyId: result.story.id,
        authorId: storyData.authorID
      })
      return { success: true, story: result.story }
    }
    
    logger.warn('Failed to create story', { error: result.error })
    return { error: result.error }
  } catch (error) {
    logger.error('Error creating story', {
      title: storyData.title,
      authorId: storyData.authorID,
      error: error instanceof Error ? error.message : String(error)
    })
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

export async function updateExistingStory(storyData: Story) {
  try {
    logger.debug('Updating story', {
      storyId: storyData.id,
      title: storyData.title
    })
    
    const transformedData: UpdateStoryInput = {
      id: storyData.id,
      title: storyData.title,
      subtitle: storyData.subtitle || '',
      event_date: storyData.eventDate || null,
      location: storyData.location || null,
      privacy: storyData.privacy,
      custom_access_members: storyData.customAccessMembers || [],
      blocks: storyData.blocks,
      people_involved: storyData.peopleInvolved || []
    }
    
    const result = await updateStory(transformedData)
    
    if (result.success) {
      logger.info('Story updated successfully', { storyId: storyData.id })
      return { success: true, story: result.story }
    }
    
    logger.warn('Failed to update story', { 
      storyId: storyData.id, 
      error: result.error 
    })
    return { error: result.error }
  } catch (error) {
    logger.error('Error updating story', {
      storyId: storyData.id,
      error: error instanceof Error ? error.message : String(error)
    })
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

export async function removeStory(storyId: string) {
  try {
    logger.debug('Removing story', { storyId })
    
    const result = await deleteStory(storyId)
    
    if (result.success) {
      logger.info('Story deleted successfully', { storyId })
      return { success: true, story: result.story }
    }
    
    logger.warn('Failed to delete story', { storyId, error: result.error })
    return { error: result.error }
  } catch (error) {
    logger.error('Error deleting story', {
      storyId,
      error: error instanceof Error ? error.message : String(error)
    })
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

