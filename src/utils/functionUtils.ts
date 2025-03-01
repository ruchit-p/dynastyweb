import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth } from '@/lib/firebase';
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
    const functionRef = httpsCallable(functions, 'getAccessibleStories');
    const result = await functionRef({ userId, familyTreeId });
    return result.data as { stories: EnrichedStory[] };
  } catch (error) {
    console.warn('[getAccessibleStories] Callable function failed, trying HTTP endpoint:', error);
    
    // Fallback to HTTP endpoint
    try {
      // Get the current user's ID token
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const idToken = await currentUser.getIdToken();
      
      // Construct the URL
      const url = new URL(`https://${functions.region}-${functions.app.options.projectId}.cloudfunctions.net/getAccessibleStoriesHttp`);
      url.searchParams.append('familyTreeId', familyTreeId);
      
      // Make the fetch request with Authorization header
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      return data as { stories: EnrichedStory[] };
    } catch (httpError) {
      console.error('[getAccessibleStories] HTTP endpoint also failed:', httpError);
      throw httpError;
    }
  }
};

export const getUserStories = async (userId: string) => {
  try {
    // Try callable function first
    const functionRef = httpsCallable(functions, 'getUserStories');
    const result = await functionRef({ userId });
    return result.data as { stories: EnrichedStory[] };
  } catch (error) {
    console.warn('[getUserStories] Callable function failed, trying HTTP endpoint:', error);
    
    // Fallback to HTTP endpoint
    try {
      // Get the current user's ID token
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const idToken = await currentUser.getIdToken();
      
      // Construct the URL
      const url = new URL(`https://${functions.region}-${functions.app.options.projectId}.cloudfunctions.net/getUserStoriesHttp`);
      
      // Make the fetch request with Authorization header
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      return data as { stories: EnrichedStory[] };
    } catch (httpError) {
      console.error('[getUserStories] HTTP endpoint also failed:', httpError);
      throw httpError;
    }
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
    const functionRef = httpsCallable(functions, 'createStory');
    const result = await functionRef(storyData);
    return result.data as { id: string };
  } catch (error) {
    console.warn('[createStory] Callable function failed, trying HTTP endpoint:', error);
    
    // Fallback to HTTP endpoint
    try {
      // Get the current user's ID token
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const idToken = await currentUser.getIdToken();
      
      // Construct the URL
      const url = new URL(`https://${functions.region}-${functions.app.options.projectId}.cloudfunctions.net/createStoryHttp`);
      
      // Make the fetch request with Authorization header
      const response = await fetch(url.toString(), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      return data as { id: string };
    } catch (httpError) {
      console.error('[createStory] HTTP endpoint also failed:', httpError);
      throw httpError;
    }
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
    const functionRef = httpsCallable(functions, 'updateStory');
    const result = await functionRef({ storyId, userId, updates });
    return result.data as { success: boolean };
  } catch (error) {
    console.warn('[updateStory] Callable function failed, trying HTTP endpoint:', error);
    
    // Fallback to HTTP endpoint
    try {
      // Get the current user's ID token
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const idToken = await currentUser.getIdToken();
      
      // Construct the URL
      const url = new URL(`https://${functions.region}-${functions.app.options.projectId}.cloudfunctions.net/updateStoryHttp`);
      
      // Make the fetch request with Authorization header
      const response = await fetch(url.toString(), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storyId, userId, updates }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      return data as { success: boolean };
    } catch (httpError) {
      console.error('[updateStory] HTTP endpoint also failed:', httpError);
      throw httpError;
    }
  }
};

export const deleteStory = async (storyId: string, userId: string) => {
  try {
    // Try callable function first
    const functionRef = httpsCallable(functions, 'deleteStory');
    const result = await functionRef({ storyId, userId });
    return result.data as { success: boolean };
  } catch (error) {
    console.warn('[deleteStory] Callable function failed, trying HTTP endpoint:', error);
    
    // Fallback to HTTP endpoint
    try {
      // Get the current user's ID token
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const idToken = await currentUser.getIdToken();
      
      // Construct the URL
      const url = new URL(`https://${functions.region}-${functions.app.options.projectId}.cloudfunctions.net/deleteStoryHttp`);
      url.searchParams.append('storyId', storyId);
      
      // Make the fetch request with Authorization header
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP request failed with status ${response.status}`);
      }
      
      const data = await response.json();
      return data as { success: boolean };
    } catch (httpError) {
      console.error('[deleteStory] HTTP endpoint also failed:', httpError);
      throw httpError;
    }
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