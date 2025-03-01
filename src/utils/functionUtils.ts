import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '@/lib/firebase';
import type { Node } from 'relatives-tree/lib/types';
import type { Story } from './storyUtils';
import { auth } from '@/lib/firebase';

// Initialize Firebase Functions
const functions = getFunctions(app);

// Define response types
interface StoriesSuccessResponse {
  success: true;
  data: {
    stories: EnrichedStory[];
  };
}

interface CreateStorySuccessResponse {
  success: true;
  data: {
    id: string;
  };
}

interface UpdateDeleteSuccessResponse {
  success: true;
  data?: {
    id: string;
    [key: string]: unknown;
  };
}

interface LegacyStoriesResponse {
  stories: EnrichedStory[];
}

interface LegacyCreateResponse {
  id: string;
}

interface LegacyUpdateDeleteResponse {
  success: boolean;
  data?: never;
}

interface ErrorResponse {
  success: false;
  error: string;
  message?: string;
}

type StoriesApiResponse = StoriesSuccessResponse | ErrorResponse | LegacyStoriesResponse;
type CreateStoryApiResponse = CreateStorySuccessResponse | ErrorResponse | LegacyCreateResponse;
type UpdateDeleteApiResponse = UpdateDeleteSuccessResponse | ErrorResponse | LegacyUpdateDeleteResponse;

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
    
    // Handle the updated response format
    const responseData = result.data as StoriesApiResponse;
    
    if ('success' in responseData && responseData.success === true) {
      return responseData.data;
    } else if ('stories' in responseData) {
      // Handle legacy format for backward compatibility
      return { stories: responseData.stories };
    }
    
    throw new Error('Unexpected response format');
  } catch (error) {
    console.warn('[getAccessibleStories] Callable function failed, trying HTTP endpoint:', error);
    
    // Implement a direct fetch as fallback
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('User not authenticated');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL}/getAccessibleStoriesHttp?familyTreeId=${familyTreeId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json() as StoriesApiResponse;
      
      // Handle the updated response format
      if ('success' in data && data.success === true) {
        return data.data;
      } else if ('stories' in data) {
        // Legacy format
        return { stories: data.stories };
      }
      
      throw new Error('Unexpected response format from HTTP endpoint');
    } catch (httpError) {
      console.error('[getAccessibleStories] HTTP fallback failed:', httpError);
      throw httpError;
    }
  }
};

export const getUserStories = async (userId: string) => {
  try {
    // Try callable function first
    const functionRef = httpsCallable(functions, 'getUserStoriesHttp');
    const result = await functionRef({ userId });
    
    // Handle the updated response format
    const responseData = result.data as StoriesApiResponse;
    
    if ('success' in responseData && responseData.success === true) {
      return responseData.data;
    } else if ('stories' in responseData) {
      // Handle legacy format for backward compatibility
      return { stories: responseData.stories };
    }
    
    throw new Error('Unexpected response format');
  } catch (error) {
    console.warn('[getUserStories] Callable function failed, trying HTTP endpoint:', error);
    
    // Implement a direct fetch as fallback
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('User not authenticated');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL}/getUserStoriesHttp${userId ? `?userId=${userId}` : ''}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json() as StoriesApiResponse;
      
      // Handle the updated response format
      if ('success' in data && data.success === true) {
        return data.data;
      } else if ('stories' in data) {
        // Legacy format
        return { stories: data.stories };
      }
      
      throw new Error('Unexpected response format from HTTP endpoint');
    } catch (httpError) {
      console.error('[getUserStories] HTTP fallback failed:', httpError);
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
    const functionRef = httpsCallable(functions, 'createStoryHttp');
    const result = await functionRef(storyData);
    
    // Handle the updated response format
    const responseData = result.data as CreateStoryApiResponse;
    
    if ('success' in responseData && responseData.success === true && responseData.data) {
      return responseData.data;
    } else if ('id' in responseData) {
      // Legacy format
      return { id: responseData.id };
    }
    
    throw new Error('Unexpected response format');
  } catch (error) {
    console.warn('[createStory] Callable function failed, trying HTTP endpoint:', error);
    
    // Implement a direct fetch as fallback
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('User not authenticated');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL}/createStoryHttp`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(storyData),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json() as CreateStoryApiResponse;
      
      // Handle the updated response format
      if ('success' in data && data.success === true && data.data) {
        return data.data;
      } else if ('id' in data) {
        // Legacy format
        return { id: data.id };
      }
      
      throw new Error('Unexpected response format from HTTP endpoint');
    } catch (httpError) {
      console.error('[createStory] HTTP fallback failed:', httpError);
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
    const functionRef = httpsCallable(functions, 'updateStoryHttp');
    const result = await functionRef({ storyId, userId, updates });
    
    // Handle the updated response format
    const responseData = result.data as UpdateDeleteApiResponse;
    
    if ('success' in responseData && responseData.success === true) {
      // Narrowed type to UpdateDeleteSuccessResponse
      return (responseData as UpdateDeleteSuccessResponse).data || { success: true };
    } else if ('success' in responseData && typeof responseData.success === 'boolean') {
      // Legacy format
      return { success: responseData.success };
    }
    
    throw new Error('Unexpected response format');
  } catch (error) {
    console.warn('[updateStory] Callable function failed, trying HTTP endpoint:', error);
    
    // Implement a direct fetch as fallback
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('User not authenticated');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL}/updateStoryHttp`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ storyId, userId, updates }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json() as UpdateDeleteApiResponse;
      
      // Handle the updated response format
      if ('success' in data && data.success === true) {
        // Narrowed type to UpdateDeleteSuccessResponse
        return (data as UpdateDeleteSuccessResponse).data || { success: true };
      } else if ('success' in data && typeof data.success === 'boolean') {
        // Legacy format
        return { success: data.success };
      }
      
      throw new Error('Unexpected response format from HTTP endpoint');
    } catch (httpError) {
      console.error('[updateStory] HTTP fallback failed:', httpError);
      throw httpError;
    }
  }
};

export const deleteStory = async (storyId: string, userId: string) => {
  try {
    // Try callable function first
    const functionRef = httpsCallable(functions, 'deleteStoryHttp');
    const result = await functionRef({ storyId, userId });
    
    // Handle the updated response format
    const responseData = result.data as UpdateDeleteApiResponse;
    
    if ('success' in responseData && responseData.success === true) {
      // Narrowed type to UpdateDeleteSuccessResponse
      return (responseData as UpdateDeleteSuccessResponse).data || { success: true };
    } else if ('success' in responseData && typeof responseData.success === 'boolean') {
      // Legacy format
      return { success: responseData.success };
    }
    
    throw new Error('Unexpected response format');
  } catch (error) {
    console.warn('[deleteStory] Callable function failed, trying HTTP endpoint:', error);
    
    // Implement a direct fetch as fallback
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('User not authenticated');
      
      // Note: Using URLSearchParams for DELETE requests since the body might not be sent
      const url = new URL(`${process.env.NEXT_PUBLIC_FIREBASE_FUNCTIONS_URL}/deleteStoryHttp`);
      url.searchParams.append('storyId', storyId);
      
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json() as UpdateDeleteApiResponse;
      
      // Handle the updated response format
      if ('success' in data && data.success === true) {
        // Narrowed type to UpdateDeleteSuccessResponse
        return (data as UpdateDeleteSuccessResponse).data || { success: true };
      } else if ('success' in data && typeof data.success === 'boolean') {
        // Legacy format
        return { success: data.success };
      }
      
      throw new Error('Unexpected response format from HTTP endpoint');
    } catch (httpError) {
      console.error('[deleteStory] HTTP fallback failed:', httpError);
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