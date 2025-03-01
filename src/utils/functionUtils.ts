import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { Node } from 'relatives-tree/lib/types';
import type { Story } from './storyUtils';

// Initialize Firebase Functions
const functions = getFunctions(app);

// Define the enriched story type
type EnrichedStory = Story & {
  author: {
    id: string;
    displayName: string;
    profilePicture?: string;
  };
  taggedPeople: Array<{
    id: string;
    displayName: string;
  }>;
};

// MARK: - Family Tree Functions

export const getFamilyTreeData = async (userId: string) => {
  const functionRef = httpsCallable(functions, 'getFamilyTreeData');
  const result = await functionRef({ userId });
  return result.data as { treeNodes: Node[] };
};

export const updateFamilyRelationships = async (
  userId: string,
  updates: {
    addParents?: string[];
    removeParents?: string[];
    addChildren?: string[];
    removeChildren?: string[];
    addSpouses?: string[];
    removeSpouses?: string[];
  }
) => {
  const functionRef = httpsCallable(functions, 'updateFamilyRelationships');
  const result = await functionRef({ userId, updates });
  return result.data as { success: boolean };
};

// MARK: - Stories Functions

export const getAccessibleStories = async (userId: string, familyTreeId: string) => {
  try {
    // Try callable function first
    const functionRef = httpsCallable(functions, 'getAccessibleStoriesHttp');
    const result = await functionRef({ userId, familyTreeId });
    return result.data as { stories: EnrichedStory[] };
  } catch (error) {
    console.warn('[getAccessibleStories] Callable function failed, trying HTTP endpoint:', error);
  }
};

export const getUserStories = async (userId: string) => {
  try {
    // Try callable function first
    const functionRef = httpsCallable(functions, 'getUserStoriesHttp');
    const result = await functionRef({ userId });
    return result.data as { stories: EnrichedStory[] };
  } catch (error) {
    console.warn('[getUserStories] Callable function failed, trying HTTP endpoint:', error);
  }
};

export const createStory = async (storyData: {
  authorID: string;
  title: string;
  subtitle?: string;
  eventDate?: Date;
  location?: {
    lat: number;
    lng: number;
    address: string;
  };
  privacy: 'family' | 'privateAccess' | 'custom';
  customAccessMembers?: string[];
  blocks: Array<{
    type: 'text' | 'image' | 'video' | 'audio';
    data: string;
    localId: string;
  }>;
  familyTreeId: string;
  peopleInvolved: string[];
}) => {
  try {
    // Try callable function first
    const functionRef = httpsCallable(functions, 'createStoryHttp');
    const result = await functionRef(storyData);
    return result.data as { id: string };
  } catch (error) {
    console.warn('[createStory] Callable function failed, trying HTTP endpoint:', error);
  }
};

export const updateStory = async (
  storyId: string,
  userId: string,
  updates: Partial<{
    title: string;
    subtitle: string;
    eventDate: Date;
    location: {
      lat: number;
      lng: number;
      address: string;
    };
    privacy: 'family' | 'privateAccess' | 'custom';
    customAccessMembers: string[];
    blocks: Array<{
      type: 'text' | 'image' | 'video' | 'audio';
      data: string;
      localId: string;
    }>;
    peopleInvolved: string[];
  }>
) => {
  try {
    // Try callable function first
    const functionRef = httpsCallable(functions, 'updateStoryHttp');
    const result = await functionRef({ storyId, userId, updates });
    return result.data as { success: boolean };
  } catch (error) {
    console.warn('[updateStory] Callable function failed, trying HTTP endpoint:', error);
  }
};

export const deleteStory = async (storyId: string, userId: string) => {
  try {
    // Try callable function first
    const functionRef = httpsCallable(functions, 'deleteStoryHttp');
    const result = await functionRef({ storyId, userId });
    return result.data as { success: boolean };
  } catch (error) {
    console.warn('[deleteStory] Callable function failed, trying HTTP endpoint:', error);
  }
};

export const createFamilyMember = async (
  userData: {
    firstName: string;
    lastName: string;
    displayName: string;
    dateOfBirth: Date;
    gender: string;
    status: string;
    phone?: string;
    email?: string;
    familyTreeId: string;
  },
  relationType: 'parent' | 'spouse' | 'child',
  selectedNodeId: string,
  options: {
    connectToChildren?: boolean;
    connectToSpouse?: boolean;
    connectToExistingParent?: boolean;
  }
) => {
  const functionRef = httpsCallable(functions, 'createFamilyMember');
  const result = await functionRef({ userData, relationType, selectedNodeId, options });
  return result.data as { success: boolean; userId: string };
};

export const deleteFamilyMember = async (
  memberId: string,
  familyTreeId: string,
  currentUserId: string
) => {
  const functionRef = httpsCallable(functions, 'deleteFamilyMember');
  const result = await functionRef({ memberId, familyTreeId, currentUserId });
  return result.data as { success: boolean };
}; 