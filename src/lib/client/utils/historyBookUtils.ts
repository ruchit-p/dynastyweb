import type { HistoryBook } from '@/lib/shared/types/story'
import type { Story } from '@/lib/shared/types/story'

// MARK: - History Book Privacy

/**
 * Determines whether a user can access a history book
 * @param historyBook The history book to check
 * @param userId The ID of the user to check access for
 * @returns True if the user can access the history book, false otherwise
 */
export function canAccessHistoryBook(historyBook: HistoryBook, userId: string): boolean {
  // The owner of the history book always has access
  if (historyBook.owner_id === userId) return true
  
  // For family privacy, check if user is in viewers list (family members)
  if (historyBook.privacy_level === 'family' && historyBook.viewers.includes(userId)) return true
  
  // Personal history books are only accessible by the owner
  if (historyBook.privacy_level === 'personal') return false
  
  return false
}

/**
 * Determines whether a user can access a story in a history book context
 * This takes into account both the story's privacy settings and the history book's privacy settings
 * @param story The story to check
 * @param historyBook The history book containing the story
 * @param userId The ID of the user to check access for
 * @returns True if the user can access the story in this history book, false otherwise
 */
export function canAccessStoryInHistoryBook(
  story: Story, 
  historyBook: HistoryBook, 
  userId: string
): boolean {
  // First check if user can access the history book
  if (!canAccessHistoryBook(historyBook, userId)) return false
  
  // If the history book is personal, only the owner can see all stories
  if (historyBook.privacy_level === 'personal') {
    return historyBook.owner_id === userId
  }
  
  // For family history books, check story-level permissions
  if (historyBook.privacy_level === 'family') {
    // The author of the story always has access
    if (story.authorID === userId) return true
    
    // Check story privacy settings
    switch (story.privacy) {
      case 'family':
        return true // All family members can see family stories
      case 'personal':
        return story.authorID === userId // Only author can see personal stories
      case 'custom':
        return story.customAccessMembers?.includes(userId) || false // Only selected members can see
      default:
        return false
    }
  }
  
  return false
}

/**
 * Gets stories accessible to a user in a history book
 * @param stories All stories in the history book
 * @param historyBook The history book
 * @param userId The ID of the user to check access for
 * @returns An array of stories that the user can access
 */
export function getAccessibleStoriesInHistoryBook(
  stories: Story[],
  historyBook: HistoryBook,
  userId: string
): Story[] {
  return stories.filter(story => canAccessStoryInHistoryBook(story, historyBook, userId))
} 