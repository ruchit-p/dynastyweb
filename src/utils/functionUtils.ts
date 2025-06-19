import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { Node } from 'relatives-tree/lib/types';
import type { Story } from './storyUtils';
import { Timestamp } from 'firebase/firestore';
import { EventData } from './eventUtils';

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
    data: string | string[];
    localId: string;
  }>;
  familyTreeId: string;
  peopleInvolved: string[];
  coverPhoto?: string;
}) => {
  console.log("📞 Creating function reference for createStory");
  const functionRef = httpsCallable(functions, 'createStory');
  
  try {
    console.log("📤 Sending story data to Firebase function", { 
      title: storyData.title,
      blocksCount: storyData.blocks.length,
      hasCoverPhoto: !!storyData.coverPhoto,
      familyTreeId: storyData.familyTreeId
    });
    
    // Add debugger for browser inspection
    debugger;
    
    const result = await functionRef(storyData);
    console.log("📥 Received response from createStory function", result.data);
    return result.data as { id: string };
  } catch (error) {
    console.error("❌ Error in createStory function call:", error);
    throw error;
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
      data: string | string[];
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

/**
 * Get events for the feed
 */
export async function getEventsForFeed(userId: string, familyTreeId: string) {
  try {
    console.log('Fetching events for feed with userId:', userId, 'familyTreeId:', familyTreeId);
    
    const getEventsForFeed = httpsCallable<{ userId: string, familyTreeId: string }, { events: EventData[] }>(
      functions, 
      'getEventsForFeedApi'
    );
    
    const result = await getEventsForFeed({ userId, familyTreeId });
    
    if (!result.data || !Array.isArray(result.data.events)) {
      console.error('Invalid events data structure:', result.data);
      return { events: [] };
    }
    
    return { events: result.data.events };
  } catch (error) {
    console.error('Error fetching events for feed:', error);
    // Return empty events array instead of throwing an error
    // This prevents the feed from breaking if event fetching fails
    return { events: [] };
  }
}

// MARK: - Family Management Utilities (Added to satisfy build imports)

/**
 * Adds a family member to the specified family tree.
 * Mirrors the expected parameters from the app/(protected)/family-management/add-member page.
 * Falls back to the backend callable "addFamilyMember".
 */
export const addFamilyMember = async (payload: {
  firstName: string;
  lastName: string;
  email?: string;
  dateOfBirth?: string; // ISO string expected by backend
  gender?: 'male' | 'female' | 'other';
  phoneNumber?: string;
  relationshipType: 'parent' | 'child' | 'spouse' | 'sibling' | '';
  relationshipTo: string; // user id of the relative
  sendInvite: boolean;
}) => {
  const functionRef = httpsCallable(functions, 'addFamilyMember');
  const result = await functionRef(payload);
  return result.data as { success: boolean; memberId: string };
};

/**
 * Retrieves members of a family tree.
 */
export const getFamilyTreeMembers = async (payload: { familyTreeId: string }) => {
  const functionRef = httpsCallable(functions, 'getFamilyTreeMembers');
  const result = await functionRef(payload);
  return result.data as {
    members: Array<{
      id: string;
      displayName: string;
      email?: string;
      profilePicture?: string | null;
      role: 'owner' | 'admin' | 'member';
      joinedAt: string | Date;
      status: 'active' | 'invited' | 'inactive';
    }>;
  };
};

/**
 * Retrieves pending invitations for a family tree.
 */
export const getPendingInvitations = async (payload: { familyTreeId: string }) => {
  const functionRef = httpsCallable(functions, 'getPendingInvitations');
  const result = await functionRef(payload);
  return result.data as {
    invitations: Array<{
      id: string;
      email: string;
      invitedBy: string;
      invitedAt: string | Date;
      status: 'pending' | 'accepted' | 'expired';
    }>;
  };
};

/**
 * Sends a family invitation email / link to the specified recipient.
 */
export const sendFamilyInvitation = async (payload: {
  email: string;
  firstName: string;
  lastName: string;
  relationship: string;
}) => {
  const functionRef = httpsCallable(functions, 'sendFamilyInvitation');
  const result = await functionRef(payload);
  return result.data as { success: boolean; invitationId: string };
};

/**
 * Removes (deletes) a family member. Accepts a payload object to align with client usage and internally
 * delegates to the positional `deleteFamilyMember` util.
 */
export const removeFamilyMember = async (payload: {
  memberId: string;
  familyTreeId: string;
  currentUserId?: string;
}) => {
  const { memberId, familyTreeId, currentUserId } = payload;

  // Fallback to empty string if currentUserId not provided – backend may derive it from auth context
  const result = await deleteFamilyMember(
    memberId,
    familyTreeId,
    currentUserId ?? ''
  );

  return result;
};

/**
 * Updates a member's role (admin/member) in the family tree.
 */
export const updateFamilyMemberRole = async (payload: {
  memberId: string;
  role: 'admin' | 'member';
  familyTreeId: string;
  currentUserId?: string; // optional; backend can infer from auth context
}) => {
  const functionRef = httpsCallable(functions, 'updateFamilyMemberRole');
  const result = await functionRef(payload);
  return result.data as { success: boolean; message?: string };
};

/**
 * Cancels a previously-sent family invitation.
 */
export const cancelFamilyInvitation = async (payload: { invitationId: string }) => {
  const functionRef = httpsCallable(functions, 'cancelFamilyInvitation');
  const result = await functionRef(payload);
  return result.data as { success: boolean };
}; 