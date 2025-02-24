import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Node } from 'relatives-tree/lib/types'
import type { Database } from '@/lib/shared/types/supabase'
import type { Story } from './storyUtils'

// Initialize Supabase client
const supabase = createClientComponentClient<Database>()

// Define the enriched story type
type EnrichedStory = Story & {
  author: {
    id: string
    displayName: string
    profilePicture?: string
  }
  taggedPeople: Array<{
    id: string
    displayName: string
  }>
}

// Define the tagged user type
interface TaggedUser {
  user: {
    id: string
    full_name: string
  }
}

// MARK: - Family Tree Functions

export const getFamilyTreeData = async (userId: string) => {
  const response = await fetch('/api/family-tree', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch family tree data');
  }

  const data = await response.json();
  return { treeNodes: data.treeNodes };
};

export const updateFamilyRelationships = async (
  userId: string,
  updates: {
    addParents?: string[]
    removeParents?: string[]
    addChildren?: string[]
    removeChildren?: string[]
    addSpouses?: string[]
    removeSpouses?: string[]
  }
) => {
  const { error } = await supabase.rpc('update_family_relationships', {
    p_user_id: userId,
    p_add_parents: updates.addParents || [],
    p_remove_parents: updates.removeParents || [],
    p_add_children: updates.addChildren || [],
    p_remove_children: updates.removeChildren || [],
    p_add_spouses: updates.addSpouses || [],
    p_remove_spouses: updates.removeSpouses || []
  })

  if (error) throw error
  return { success: true }
}

// MARK: - Stories Functions

export const getAccessibleStories = async (userId: string, familyTreeId: string) => {
  const { data: stories, error } = await supabase
    .from('stories')
    .select(`
      *,
      author:author_id(id, full_name, avatar_url),
      tagged_people:story_tags(
        user:user_id(id, full_name)
      )
    `)
    .eq('family_tree_id', familyTreeId)
    .eq('is_deleted', false)
    .or(`privacy_level.eq.family,and(privacy_level.eq.personal,author_id.eq.${userId}),and(privacy_level.eq.custom,custom_access_members.cs.{${userId}})`)
    .order('created_at', { ascending: false })

  if (error) throw error

  // Transform the data to match the EnrichedStory type
  const enrichedStories: EnrichedStory[] = stories.map(story => ({
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
    isDeleted: story.is_deleted,
    author: {
      id: story.author.id,
      displayName: story.author.full_name,
      profilePicture: story.author.avatar_url
    },
    taggedPeople: story.tagged_people.map(tag => ({
      id: tag.user.id,
      displayName: tag.user.full_name
    }))
  }))

  return { stories: enrichedStories }
}

export const getUserStories = async (userId: string) => {
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

  // Transform the data to match the EnrichedStory type
  const enrichedStories: EnrichedStory[] = stories.map(story => ({
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
    isDeleted: story.is_deleted,
    author: {
      id: story.author.id,
      displayName: story.author.full_name,
      profilePicture: story.author.avatar_url
    },
    taggedPeople: story.tagged_people.map(tag => ({
      id: tag.user.id,
      displayName: tag.user.full_name
    }))
  }))

  return { stories: enrichedStories }
}

export const createStory = async (storyData: {
  authorID: string
  title: string
  subtitle?: string
  eventDate?: Date
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
}) => {
  const { data, error } = await supabase
    .from('stories')
    .insert({
      author_id: storyData.authorID,
      title: storyData.title,
      subtitle: storyData.subtitle,
      event_date: storyData.eventDate?.toISOString(),
      location: storyData.location,
      privacy_level: storyData.privacy === 'personal' ? 'personal' : storyData.privacy,
      custom_access_members: storyData.privacy === 'custom' ? storyData.customAccessMembers : [],
      blocks: storyData.blocks,
      family_tree_id: storyData.familyTreeId,
      people_involved: storyData.peopleInvolved,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false
    })
    .select()
    .single()

  if (error) throw error
  return { id: data.id }
}

export const updateStory = async (
  storyId: string,
  userId: string,
  updates: Partial<{
    title: string
    subtitle: string
    eventDate: Date
    location: {
      lat: number
      lng: number
      address: string
    }
    privacy: 'family' | 'personal' | 'custom'
    customAccessMembers: string[]
    blocks: Array<{
      type: 'text' | 'image' | 'video' | 'audio'
      data: string
      localId: string
    }>
    peopleInvolved: string[]
  }>
) => {
  // First check if user has permission to update
  const { data: story, error: fetchError } = await supabase
    .from('stories')
    .select('author_id')
    .eq('id', storyId)
    .single()

  if (fetchError) throw fetchError
  if (story.author_id !== userId) throw new Error('Unauthorized to update this story')

  const { error } = await supabase
    .from('stories')
    .update({
      title: updates.title,
      subtitle: updates.subtitle,
      event_date: updates.eventDate?.toISOString(),
      location: updates.location,
      privacy_level: updates.privacy,
      custom_access_members: updates.privacy === 'custom' ? updates.customAccessMembers : [],
      blocks: updates.blocks,
      people_involved: updates.peopleInvolved,
      updated_at: new Date().toISOString()
    })
    .eq('id', storyId)

  if (error) throw error
  return { success: true }
}

export const deleteStory = async (storyId: string, userId: string) => {
  // First check if user has permission to delete
  const { data: story, error: fetchError } = await supabase
    .from('stories')
    .select('author_id')
    .eq('id', storyId)
    .single()

  if (fetchError) throw fetchError
  if (story.author_id !== userId) throw new Error('Unauthorized to delete this story')

  const { error } = await supabase
    .from('stories')
    .update({ is_deleted: true })
    .eq('id', storyId)

  if (error) throw error
  return { success: true }
}

export const createFamilyMember = async (
  userData: {
    firstName: string
    lastName: string
    displayName: string
    dateOfBirth: Date
    gender: string
    status: string
    phone?: string
    email?: string
    familyTreeId: string
  },
  relationType: 'parent' | 'spouse' | 'child',
  selectedNodeId: string,
  options: {
    connectToChildren?: boolean
    connectToSpouse?: boolean
    connectToExistingParent?: boolean
  }
) => {
  const response = await fetch('/api/family-tree', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userData,
      relationType,
      selectedNodeId,
      options,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to create family member');
  }

  return response.json();
};

export const deleteFamilyMember = async (
  memberId: string,
  familyTreeId: string,
  currentUserId: string
) => {
  const response = await fetch('/api/family-tree', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      memberId,
      familyTreeId,
      currentUserId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete family member');
  }

  return response.json();
};

export const enrichStory = (story: Story): EnrichedStory => ({
  ...story,
  author: {
    id: story.author.id,
    displayName: story.author.full_name,
    profilePicture: story.author.avatar_url
  },
  taggedPeople: (story.tagged_people as TaggedUser[]).map(tag => ({
    id: tag.user.id,
    displayName: tag.user.full_name
  }))
}) 