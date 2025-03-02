import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { Node } from 'relatives-tree/lib/types';
import type { Story } from './storyUtils';
import { Timestamp } from 'firebase/firestore';

// Initialize Firebase Functions
const functions = getFunctions(app, 'us-central1');

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
  const functionRef = httpsCallable(functions, 'getUserStories', {
    timeout: 60000, // 60 seconds timeout
  });
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

export const updateFamilyMember = async (
  memberId: string,
  updates: {
    firstName: string;
    lastName: string;
    displayName: string;
    gender: string;
    phone?: string;
    email?: string;
  },
  familyTreeId: string
) => {
  const functionRef = httpsCallable(functions, 'updateFamilyMember');
  const result = await functionRef({ memberId, updates, familyTreeId });
  return result.data as { success: boolean };
};

// MARK: - Family Tree Admin Management

export const promoteToAdmin = async (
  memberId: string,
  familyTreeId: string,
  currentUserId: string
) => {
  const functionRef = httpsCallable(functions, 'promoteToAdmin');
  const result = await functionRef({ memberId, familyTreeId, currentUserId });
  return result.data as { success: boolean; message?: string };
};

export const demoteToMember = async (
  memberId: string,
  familyTreeId: string,
  currentUserId: string
) => {
  const functionRef = httpsCallable(functions, 'demoteToMember');
  const result = await functionRef({ memberId, familyTreeId, currentUserId });
  return result.data as { success: boolean; message?: string };
};

/**
 * Fetches the family tree management data including members and their admin status
 * @returns Family tree data and members with admin/owner status
 */
export const getFamilyManagementData = async () => {
  const functionRef = httpsCallable(functions, 'getFamilyManagementData');
  const result = await functionRef();
  return result.data as {
    tree: {
      id: string;
      ownerUserId: string;
      memberUserIds: string[];
      adminUserIds: string[];
      treeName: string;
      createdAt: Timestamp;
    };
    members: Array<{
      id: string;
      displayName: string;
      profilePicture: string | null;
      createdAt: Timestamp;
      isAdmin: boolean;
      isOwner: boolean;
    }>;
  };
}; 