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
  const functionRef = httpsCallable(functions, 'getAccessibleStories');
  const result = await functionRef({ userId, familyTreeId });
  return result.data as { stories: EnrichedStory[] };
};

export const getUserStories = async (userId: string) => {
  const functionRef = httpsCallable(functions, 'getUserStories');
  const result = await functionRef({ userId });
  return result.data as { stories: EnrichedStory[] };
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
  const functionRef = httpsCallable(functions, 'createStory');
  const result = await functionRef(storyData);
  return result.data as { id: string };
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
  const functionRef = httpsCallable(functions, 'updateStory');
  const result = await functionRef({ storyId, userId, updates });
  return result.data as { success: boolean; id?: string };
};

export const deleteStory = async (storyId: string, userId: string) => {
  const functionRef = httpsCallable(functions, 'deleteStory');
  const result = await functionRef({ storyId, userId });
  return result.data as { success: boolean };
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