import { Database } from '@/lib/shared/types/supabase'
import { createStory, updateStory, deleteStory, getUserStories, getAccessibleStories } from '@/app/actions/stories'
import type { CreateStoryInput, UpdateStoryInput } from '@/app/actions/stories'

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
  privacy: Database['public']['Tables']['stories']['Row']['privacy_level']
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
    return await getUserStories(userId)
  } catch (error) {
    console.error('Error fetching user stories:', error)
    return []
  }
}

export async function fetchAccessibleStories(userId: string): Promise<Story[]> {
  try {
    return await getAccessibleStories(userId)
  } catch (error) {
    console.error('Error fetching accessible stories:', error)
    return []
  }
}

type ActionResult<T> = { success: true; story: T } | { error: string }

export async function createNewStory(storyData: Story) {
  try {
    const result = await createStory({
      title: storyData.title,
      content: JSON.stringify(storyData.blocks),
      familyTreeId: storyData.familyTreeId,
      mediaUrls: getStoryMedia(storyData),
      tags: storyData.peopleInvolved
    } satisfies CreateStoryInput) as ActionResult<Story>
    
    if ('error' in result) {
      throw new Error(result.error)
    }
    
    return result.story
  } catch (error) {
    console.error('Error creating story:', error)
    throw error
  }
}

export async function updateExistingStory(storyData: Story) {
  try {
    const result = await updateStory({
      id: storyData.id,
      title: storyData.title,
      content: JSON.stringify(storyData.blocks),
      mediaUrls: getStoryMedia(storyData),
      tags: storyData.peopleInvolved
    } satisfies UpdateStoryInput) as ActionResult<Story>
    
    if ('error' in result) {
      throw new Error(result.error)
    }
    
    return result.story
  } catch (error) {
    console.error('Error updating story:', error)
    throw error
  }
}

export async function removeStory(storyId: string) {
  try {
    const result = await deleteStory(storyId) as ActionResult<void>
    if ('error' in result) {
      throw new Error(result.error)
    }
    return true
  } catch (error) {
    console.error('Error deleting story:', error)
    throw error
  }
}

