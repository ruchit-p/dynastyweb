import { createStory, updateStory, deleteStory, getUserStories, getAccessibleStories } from '@/app/actions/stories'
import { createLogger } from '@/lib/client/logger'
import type { Story } from '@/lib/shared/types/story'

// Create a logger for story utilities
const logger = createLogger('storyUtils')

// MARK: - Story Validation
export function validateStoryInput(story: Partial<Story>): string[] {
  const errors: string[] = []

  if (!story.title?.trim()) {
    errors.push('Title is required')
  }

  if (!story.family_tree_id && !story.familyTreeId) {
    errors.push('Family tree ID is required')
  }

  if ((story.privacy === 'custom' || story.privacy_level === 'custom') && 
      (!story.custom_access_members?.length && !story.customAccessMembers?.length)) {
    errors.push('Custom access members are required for custom privacy')
  }

  if (story.blocks?.some(block => !block.type || !block.content)) {
    errors.push('All story blocks must have a type and content')
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
  const storyAuthorId = story.authorID || story.user_id
  const storyPrivacy = story.privacy || story.privacy_level
  const storyFamilyTreeId = story.familyTreeId || story.family_tree_id
  const storyCustomMembers = story.customAccessMembers || story.custom_access_members || []
  
  if (storyAuthorId === userId) return true
  if (storyPrivacy === 'family' && storyFamilyTreeId === familyTreeId) return true
  if (storyPrivacy === 'custom' && storyCustomMembers.includes(userId)) return true
  return false
}

// MARK: - Story Content
export function extractStoryPreview(story: Story): string {
  if (!story.blocks || story.blocks.length === 0) return ''
  
  const textBlock = story.blocks.find(block => block.type === 'text')
  if (!textBlock) return ''
  
  const text = textBlock.content
  const maxLength = 150
  if (text.length <= maxLength) return text
  
  return text.substring(0, maxLength) + '...'
}

export function getStoryMedia(story: Story): string[] {
  if (!story.blocks) return []
  
  return story.blocks
    .filter(block => ['image', 'video', 'audio'].includes(block.type))
    .map(block => block.content)
}

// MARK: - Story Sorting
export function sortStoriesByDate(stories: Story[], ascending = false): Story[] {
  return [...stories].sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt || '').getTime()
    const dateB = new Date(b.created_at || b.createdAt || '').getTime()
    return ascending ? dateA - dateB : dateB - dateA
  })
}

// MARK: - Story Filtering
export function filterStoriesByDateRange(stories: Story[], startDate: Date, endDate: Date): Story[] {
  return stories.filter(story => {
    const storyDate = new Date(story.created_at || story.createdAt || '')
    return storyDate >= startDate && storyDate <= endDate
  })
}

export function filterStoriesByAuthor(stories: Story[], authorId: string): Story[] {
  return stories.filter(story => 
    (story.authorID === authorId) || (story.user_id === authorId)
  )
}

export function filterStoriesByPrivacy(stories: Story[], privacy: 'family' | 'personal' | 'custom'): Story[] {
  return stories.filter(story => 
    (story.privacy === privacy) || (story.privacy_level === privacy)
  )
}

// MARK: - Story Search
export function searchStories(stories: Story[], query: string): Story[] {
  const searchTerm = query.toLowerCase()
  return stories.filter(story => 
    story.title.toLowerCase().includes(searchTerm) ||
    (story.blocks?.some(block => 
      block.type === 'text' && block.content.toLowerCase().includes(searchTerm)
    ))
  )
}

// MARK: - Story Actions
export async function fetchUserStories(): Promise<Story[]> {
  try {
    const result = await getUserStories();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch user stories');
    }
    return result.data.stories as Story[];
  } catch (error) {
    logger.error('Error fetching user stories', {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

export async function fetchAccessibleStories(): Promise<Story[]> {
  try {
    const result = await getAccessibleStories();
    if (!result.success || !result.data) {
      throw new Error(result.error || 'Failed to fetch accessible stories');
    }
    return result.data.stories as Story[];
  } catch (error) {
    logger.error('Error fetching accessible stories', {
      error: error instanceof Error ? error.message : String(error)
    });
    return [];
  }
}

type ActionResult<T> = { success: true; story: T } | { success: false; error: string }

export async function createNewStory(storyData: Partial<Story>): Promise<ActionResult<Story>> {
  try {
    logger.debug('Creating new story', {
      title: storyData.title,
      authorId: storyData.user_id || storyData.authorID,
      privacy: storyData.privacy || storyData.privacy_level,
      blocksCount: storyData.blocks?.length
    })
    
    // Create a FormData object for the server action
    const formData = new FormData()
    formData.append('title', storyData.title || '')
    formData.append('subtitle', storyData.subtitle || '')
    
    if (storyData.id) {
      formData.append('id', storyData.id)
    }
    
    if (storyData.event_date || storyData.eventDate) {
      const eventDate = storyData.event_date || storyData.eventDate || '';
      formData.append('event_date', eventDate);
    }
    
    if (storyData.location) {
      const locationValue = typeof storyData.location === 'string' 
        ? storyData.location 
        : JSON.stringify(storyData.location);
      formData.append('location', locationValue);
    }
    
    formData.append('privacy', storyData.privacy || storyData.privacy_level || 'family')
    
    if (storyData.custom_access_members?.length || storyData.customAccessMembers?.length) {
      const members = storyData.custom_access_members || storyData.customAccessMembers || [];
      formData.append('custom_access_members', JSON.stringify(members));
    }
    
    if (storyData.blocks?.length) {
      formData.append('blocks', JSON.stringify(storyData.blocks));
    }
    
    const familyTreeId = storyData.family_tree_id || storyData.familyTreeId || '';
    formData.append('family_tree_id', familyTreeId);
    
    if (storyData.people_involved?.length || storyData.peopleInvolved?.length) {
      const people = storyData.people_involved || storyData.peopleInvolved || [];
      formData.append('people_involved', JSON.stringify(people));
    }
    
    const response = await createStory(formData)
    
    if (response.success && response.data?.story) {
      logger.info('Story created successfully', { 
        storyId: response.data.story.id,
        authorId: storyData.user_id || storyData.authorID
      })
      return { success: true, story: response.data.story }
    }
    
    logger.warn('Failed to create story', { error: response.error || 'Unknown error' })
    return { success: false, error: response.error || 'Failed to create story' }
  } catch (error) {
    logger.error('Error creating story', {
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
    logger.debug('Updating story', {
      storyId: storyData.id,
      title: storyData.title
    })
    
    // Create a FormData object for the server action
    const formData = new FormData()
    formData.append('id', storyData.id)
    
    if (storyData.title) {
      formData.append('title', storyData.title)
    }
    
    if (storyData.subtitle) {
      formData.append('subtitle', storyData.subtitle)
    }
    
    if (storyData.event_date || storyData.eventDate) {
      const eventDate = storyData.event_date || storyData.eventDate || '';
      formData.append('event_date', eventDate);
    }
    
    if (storyData.location) {
      const locationValue = typeof storyData.location === 'string' 
        ? storyData.location 
        : JSON.stringify(storyData.location);
      formData.append('location', locationValue);
    }
    
    if (storyData.privacy || storyData.privacy_level) {
      const privacy = storyData.privacy || storyData.privacy_level || 'family';
      formData.append('privacy', privacy);
    }
    
    if (storyData.custom_access_members?.length || storyData.customAccessMembers?.length) {
      const members = storyData.custom_access_members || storyData.customAccessMembers || [];
      formData.append('custom_access_members', JSON.stringify(members));
    }
    
    if (storyData.blocks?.length) {
      formData.append('blocks', JSON.stringify(storyData.blocks));
    }
    
    if (storyData.people_involved?.length || storyData.peopleInvolved?.length) {
      const people = storyData.people_involved || storyData.peopleInvolved || [];
      formData.append('people_involved', JSON.stringify(people));
    }
    
    const response = await updateStory(formData)
    
    if (response.success && response.data?.story) {
      logger.info('Story updated successfully', { storyId: storyData.id })
      return { success: true, story: response.data.story }
    }
    
    logger.warn('Failed to update story', { 
      storyId: storyData.id, 
      error: response.error || 'Unknown error'
    })
    return { success: false, error: response.error || 'Failed to update story' }
  } catch (error) {
    logger.error('Error updating story', {
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
    logger.debug('Removing story', { storyId })
    
    // Create a FormData object for the server action
    const formData = new FormData()
    formData.append('id', storyId)
    
    const response = await deleteStory(formData)
    
    if (response.success) {
      logger.info('Story deleted successfully', { storyId })
      return { success: true, story: undefined }
    }
    
    logger.warn('Failed to delete story', { 
      storyId, 
      error: response.error || 'Unknown error'
    })
    return { 
      success: false, 
      error: response.error || 'Failed to delete story'
    }
  } catch (error) {
    logger.error('Error deleting story', {
      storyId,
      error: error instanceof Error ? error.message : String(error)
    })
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    }
  }
}

