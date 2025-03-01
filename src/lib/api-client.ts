/**
 * API Client for Supabase Edge Functions
 * 
 * This file provides a unified interface for making requests to Edge Functions.
 * It handles authentication, error handling, and response parsing.
 */

import { createClient } from '@/lib/supabase'
import logger from '@/lib/logger'

// Base URL for Edge Functions
const FUNCTIONS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1`
  : ''

// MARK: - Types

export type ApiResponse<T> = {
  data?: T
  error?: {
    message: string
    code?: string
    details?: string
  }
}

// MARK: - Family Tree Types

export enum Gender {
  male = 'male',
  female = 'female',
  other = 'other'
}

export enum RelType {
  blood = 'blood',
  married = 'married',
  divorced = 'divorced',
  adopted = 'adopted',
  half = 'half',
}

export type PrivacyLevel = 'private' | 'shared' | 'public';
export type MemberRole = 'admin' | 'editor' | 'viewer';

export interface FamilyTree {
  id: string;
  name: string;
  description?: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  privacy_level: PrivacyLevel;
  owner: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  members: {
    user: {
      id: string;
      full_name: string;
      avatar_url?: string;
    };
    role: MemberRole;
  }[];
}

export interface FamilyMember {
  id: string;
  full_name: string;
  avatar_url?: string;
  first_name?: string;
  last_name?: string;
  gender: Gender;
  date_of_birth?: string;
  date_of_death?: string;
  bio?: string;
  family_tree_id: string;
}

export interface RelationshipUpdates {
  addParents?: string[];
  removeParents?: string[];
  addChildren?: string[];
  removeChildren?: string[];
  addSpouses?: string[];
  removeSpouses?: string[];
  addSiblings?: string[];
  removeSiblings?: string[];
  relationshipTypes?: Record<string, string>;
}

export interface CreateMemberOptions {
  connectToSpouse?: boolean;
  connectToExistingParent?: boolean;
  connectToChildren?: boolean;
}

export interface RelativeTreeNode {
  id: string;
  gender: Gender;
  parents: Array<{ id: string; type: RelType }>;
  children: Array<{ id: string; type: RelType }>;
  siblings: Array<{ id: string; type: RelType }>;
  spouses: Array<{ id: string; type: RelType }>;
  attributes?: {
    displayName?: string;
    familyTreeId?: string;
    isBloodRelated?: boolean;
    profilePicture?: string;
    status?: string;
    treeOwnerId?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
    dateOfDeath?: string;
    bio?: string;
    [key: string]: unknown;
  };
}

// MARK: - Helper Functions

/**
 * Securely get an authentication token
 * Uses getUser() first to authenticate with the server, then gets the session token
 */
export async function secureGetAuthToken(): Promise<string | null> {
  const supabase = createClient()
  
  // First authenticate user securely with the server
  const { data: userData, error: userError } = await supabase.auth.getUser()
  
  if (userError || !userData.user) {
    logger.warn({
      msg: 'User authentication failed',
      error: userError?.message
    })
    return null
  }
  
  // Now that user is authenticated, we can get the session
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  
  if (!token) {
    logger.warn({
      msg: 'No access token found after successful authentication',
      userId: userData.user.id
    })
  } else {
    logger.debug({
      msg: 'Successfully retrieved auth token',
      tokenLength: token.length
    })
  }
  
  return token || null
}

/**
 * Get auth header with the current session token
 * Uses secureGetAuthToken to securely authenticate
 */
async function getAuthHeader(): Promise<HeadersInit> {
  const token = await secureGetAuthToken()
  
  // Construct headers
  if (token) {
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }
  
  return {
    'Content-Type': 'application/json'
  }
}

/**
 * Make a request to an Edge Function
 */
export async function callEdgeFunction<T>(
  functionName: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: Record<string, unknown>,
  queryParams?: Record<string, string>
): Promise<ApiResponse<T>> {
  try {
    // Build URL with query parameters
    let url = `${FUNCTIONS_URL}/${functionName}`
    if (queryParams) {
      const params = new URLSearchParams()
      Object.entries(queryParams).forEach(([key, value]) => {
        params.append(key, value)
      })
      url += `?${params.toString()}`
    }

    // Get auth headers
    const headers = await getAuthHeader()
    
    // Check if this is an authentication-related endpoint (like sign-in, sign-up)
    const isAuthEndpoint = functionName === 'auth' && 
      (body?.action === 'signIn' || body?.action === 'signUp' || body?.action === 'resetPassword')
    
    // Log request details (for debugging)
    logger.debug({
      msg: `Calling Edge Function: ${functionName}`,
      method,
      hasAuthHeader: 'Authorization' in headers,
      isAuthEndpoint,
      body: body ? { ...body, password: body.password ? '********' : undefined } : undefined,
      hasBody: !!body
    })

    // Make the request
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    })

    // Parse the response
    const data = await response.json()

    // Check for errors
    if (!response.ok) {
      logger.error({
        msg: `Edge Function error: ${functionName}`,
        status: response.status,
        error: data.error || data,
        hasAuthHeader: 'Authorization' in headers,
        responseBody: data
      })
      
      // Format error consistently regardless of server response format
      const errorObj = data.error || { message: 'An error occurred' };
      
      // Normalize the error structure 
      return {
        error: typeof errorObj === 'string' 
          ? { message: errorObj }
          : {
              message: errorObj.message || 'An unknown error occurred',
              code: errorObj.code || `http_${response.status}`,
              details: errorObj.details || undefined
            }
      }
    }

    return { data }
  } catch (error) {
    logger.error({
      msg: `Edge Function request failed: ${functionName}`,
      error: error instanceof Error ? error.message : String(error)
    })
    
    return {
      error: {
        message: error instanceof Error ? error.message : 'Network error',
        code: 'network_error'
      }
    }
  }
}

// MARK: - API Client

/**
 * Auth API for interacting with auth Edge Functions
 */
export const auth = {
  /**
   * Sign up a new user
   */
  signUp: async (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: string
  }) => {
    return callEdgeFunction('auth', 'POST', {
      action: 'signup',
      ...data
    })
  },

  /**
   * Sign in a user
   */
  signIn: async (data: { email: string; password: string }) => {
    // For sign-in, we need to call the edge function that doesn't require auth
    // Log that we're making a sign-in request
    logger.debug({
      msg: 'Making sign-in request to Edge Function',
      action: 'signin',
      email: data.email.substring(0, 3) + '***' + data.email.split('@')[1]
    })

    return callEdgeFunction('auth', 'POST', {
      action: 'signin',
      ...data
    })
  },

  /**
   * Sign out the current user
   */
  signOut: async () => {
    return callEdgeFunction('auth', 'POST', {
      action: 'signout'
    })
  },

  /**
   * Reset password
   */
  resetPassword: async (email: string) => {
    return callEdgeFunction('auth', 'POST', {
      action: 'reset-password',
      email
    })
  },

  /**
   * Verify email
   */
  verifyEmail: async (token: string) => {
    return callEdgeFunction('auth', 'POST', {
      action: 'verify-email',
      token
    })
  },

  /**
   * Verify invitation
   */
  verifyInvitation: async (token: string, invitationId: string) => {
    return callEdgeFunction('auth', 'POST', {
      action: 'verify-invitation',
      token,
      invitationId
    })
  },

  /**
   * Sign up with invitation
   */
  signUpWithInvitation: async (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    dateOfBirth: string
    gender: string
    invitationId: string
    token: string
  }) => {
    return callEdgeFunction('auth', 'POST', {
      action: 'signup-with-invitation',
      ...data
    })
  },

  /**
   * Get current user
   */
  getUser: async () => {
    return callEdgeFunction('auth', 'GET', undefined, { action: 'get-user' })
  }
}

// MARK: - Storage API

/**
 * Storage API for interacting with storage Edge Functions
 */
export const storage = {
  /**
   * Process media file
   */
  processMedia: async (url: string, options: {
    type: 'image' | 'video' | 'audio'
    params: Record<string, unknown>
  }) => {
    return callEdgeFunction('process-media', 'POST', {
      url,
      options
    })
  },

  /**
   * Upload a file to storage
   */
  uploadFile: async (file: File, options: {
    bucket: string
    path?: string
    contentType?: string
    cacheControl?: string
  }) => {
    // Create form data for file upload
    const formData = new FormData()
    formData.append('file', file)
    formData.append('bucket', options.bucket)
    if (options.path) formData.append('path', options.path)
    if (options.contentType) formData.append('contentType', options.contentType)
    if (options.cacheControl) formData.append('cacheControl', options.cacheControl)
    
    // Get auth header with token
    const token = await secureGetAuthToken()
    
    // Make fetch request to the upload endpoint
    try {
      const response = await fetch(`${FUNCTIONS_URL}/storage-upload`, {
        method: 'POST',
        headers: {
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: formData
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        return {
          error: {
            message: data.error?.message || 'Failed to upload file',
            code: data.error?.code || `http_${response.status}`,
          }
        }
      }
      
      return { data }
    } catch (error) {
      return {
        error: {
          message: error instanceof Error ? error.message : 'Network error during upload',
          code: 'network_error'
        }
      }
    }
  },
  
  /**
   * Get public URL for a file
   */
  getPublicUrl: async (bucket: string, path: string) => {
    return callEdgeFunction('storage', 'GET', undefined, {
      action: 'get-public-url',
      bucket,
      path
    })
  }
}

/**
 * Stories API for interacting with stories Edge Functions
 */
export const stories = {
  /**
   * Get a story by ID
   */
  getStory: async (id: string) => {
    return callEdgeFunction('stories', 'GET', undefined, { id })
  },

  /**
   * Create a new story
   */
  createStory: async (data: Record<string, unknown>) => {
    return callEdgeFunction('stories', 'POST', {
      action: 'create',
      ...data
    })
  },

  /**
   * Update a story
   */
  updateStory: async (id: string, data: Record<string, unknown>) => {
    return callEdgeFunction('stories', 'PUT', {
      action: 'update',
      id,
      ...data
    })
  },

  /**
   * Delete a story
   */
  deleteStory: async (id: string) => {
    return callEdgeFunction('stories', 'DELETE', {
      id
    })
  },

  /**
   * Get stories for feed
   */
  getFeed: async (params?: {
    page?: number,
    limit?: number,
    filter?: Record<string, unknown>
  }) => {
    // Convert all params to strings for queryParams
    const queryParams: Record<string, string> = { action: 'feed' };
    
    if (params) {
      if (params.page !== undefined) queryParams.page = params.page.toString();
      if (params.limit !== undefined) queryParams.limit = params.limit.toString();
      if (params.filter) {
        // Convert the filter object to a JSON string
        queryParams.filter = JSON.stringify(params.filter);
      }
    }
    
    return callEdgeFunction('stories', 'GET', undefined, queryParams);
  },
  
  /**
   * Get stories by user ID
   */
  getUserStories: async (userId: string, params?: {
    page?: number,
    limit?: number
  }) => {
    // Convert all params to strings for queryParams
    const queryParams: Record<string, string> = { 
      action: 'user-stories',
      userId
    };
    
    if (params) {
      if (params.page !== undefined) queryParams.page = params.page.toString();
      if (params.limit !== undefined) queryParams.limit = params.limit.toString();
    }
    
    return callEdgeFunction('stories', 'GET', undefined, queryParams);
  },
  
  /**
   * Get family tree stories
   */
  getFamilyTreeStories: async (familyTreeId: string, params?: {
    page?: number,
    limit?: number
  }) => {
    // Convert all params to strings for queryParams
    const queryParams: Record<string, string> = { 
      action: 'family-tree-stories',
      familyTreeId
    };
    
    if (params) {
      if (params.page !== undefined) queryParams.page = params.page.toString();
      if (params.limit !== undefined) queryParams.limit = params.limit.toString();
    }
    
    return callEdgeFunction('stories', 'GET', undefined, queryParams);
  }
}

/**
 * Media API for handling media operations
 */
export const media = {
  /**
   * Upload and process media file
   */
  uploadAndProcess: async (file: File, options: {
    bucket: string
    path?: string
    operations?: Array<{
      type: 'resize' | 'compress' | 'convert'
      params: Record<string, unknown>
    }>
  }) => {
    return callEdgeFunction('media-processor', 'POST', {
      action: 'upload-and-process',
      bucket: options.bucket,
      path: options.path || '',
      operations: options.operations || [],
      filename: file.name,
      contentType: file.type,
      size: file.size
    })
  }
}

/**
 * Family Tree API for managing family trees and members
 */
export const familyTree = {
  /**
   * Creates a new family tree
   */
  createFamilyTree: async ({
    name,
    description,
    privacyLevel = 'private'
  }: {
    name: string;
    description?: string;
    privacyLevel?: PrivacyLevel;
  }) => {
    return callEdgeFunction<{ familyTree: FamilyTree }>('create-family-tree', 'POST', {
      name,
      description,
      privacyLevel
    });
  },

  /**
   * Updates an existing family tree
   */
  updateFamilyTree: async ({
    id,
    name,
    description,
    privacyLevel
  }: {
    id: string;
    name?: string;
    description?: string;
    privacyLevel?: PrivacyLevel;
  }) => {
    return callEdgeFunction<{ familyTree: FamilyTree }>('update-family-tree', 'POST', {
      id,
      name,
      description,
      privacyLevel
    });
  },

  /**
   * Deletes a family tree
   */
  deleteFamilyTree: async (id: string) => {
    return callEdgeFunction<{ success: boolean }>('delete-family-tree', 'POST', { id });
  },

  /**
   * Gets a family tree by ID
   */
  getFamilyTree: async (id: string) => {
    return callEdgeFunction<{ familyTree: FamilyTree }>('get-family-tree-metadata', 'POST', { id });
  },

  /**
   * Gets all family trees for the current user
   */
  getUserFamilyTrees: async () => {
    return callEdgeFunction<{ familyTrees: FamilyTree[] }>('get-user-family-trees', 'POST');
  },

  /**
   * Adds a member to a family tree
   */
  addMember: async ({
    familyTreeId,
    email,
    role = 'viewer'
  }: {
    familyTreeId: string;
    email: string;
    role?: MemberRole;
  }) => {
    return callEdgeFunction<{ success: boolean }>('add-family-tree-member', 'POST', {
      familyTreeId,
      email,
      role
    });
  },

  /**
   * Gets family tree data formatted for relatives-tree library
   */
  getFamilyTreeData: async (familyTreeId: string, rootNodeId?: string) => {
    if (!familyTreeId) {
      return { error: { message: 'Family tree ID is required' } };
    }
    
    return callEdgeFunction<{ nodes: RelativeTreeNode[]; rootId: string }>('get-family-tree', 'POST', {
      familyTreeId,
      rootNodeId
    });
  },

  /**
   * Creates a new family member and updates all related relationships
   */
  createFamilyMember: async (
    userData: {
      familyTreeId: string;
      firstName?: string;
      lastName?: string;
      displayName?: string;
      gender: Gender;
      dateOfBirth?: string;
      dateOfDeath?: string;
      bio?: string;
      imageUrl?: string;
    },
    relationType: 'parent' | 'child' | 'spouse' | 'sibling',
    selectedNodeId: string,
    options?: CreateMemberOptions
  ) => {
    if (!userData || !userData.familyTreeId) {
      return { error: { message: 'User data with family tree ID is required' } };
    }
    
    return callEdgeFunction<{ newNodeId: string; updatedNodes: RelativeTreeNode[] }>('create-family-member', 'POST', {
      userData,
      relationType,
      selectedNodeId,
      options
    });
  },

  /**
   * Updates family relationships between nodes
   */
  updateFamilyRelationships: async (
    nodeId: string, 
    familyTreeId: string, 
    relationships: RelationshipUpdates
  ) => {
    if (!nodeId) {
      return { error: { message: 'Node ID is required' } };
    }
    
    if (!familyTreeId) {
      return { error: { message: 'Family tree ID is required' } };
    }
    
    return callEdgeFunction<{ updatedNodes: RelativeTreeNode[] }>('update-family-relationships', 'POST', {
      nodeId,
      familyTreeId,
      relationships
    });
  },

  /**
   * Deletes a family member and updates all related relationships
   */
  deleteFamilyMember: async (nodeId: string, familyTreeId: string) => {
    if (!nodeId) {
      return { error: { message: 'Node ID is required' } };
    }
    
    if (!familyTreeId) {
      return { error: { message: 'Family tree ID is required' } };
    }
    
    return callEdgeFunction<{ success: boolean; updatedNodes: RelativeTreeNode[] }>('delete-family-member', 'POST', {
      nodeId,
      familyTreeId
    });
  },

  /**
   * Formats tree data specifically for the relatives-tree library
   */
  formatForRelativesTreeLibrary: (nodes: RelativeTreeNode[]) => {
    if (!nodes || nodes.length === 0) {
      return [];
    }

    return nodes.map(node => {
      // Ensure gender is exactly 'male' or 'female' as expected by the library
      const gender = node.gender === Gender.male ? 'male' : 'female';
      
      // Create a properly formatted attributes object with displayName at minimum
      const attributes = {
        displayName: node.attributes?.displayName || node.id,
        ...node.attributes
      };

      // Return the formatted node
      return {
        id: node.id,
        gender,
        parents: node.parents,
        children: node.children,
        siblings: node.siblings,
        spouses: node.spouses,
        attributes
      };
    });
  }
}

/**
 * Export other API modules for different Edge Functions
 */
export const api = {
  auth,
  storage,
  stories,
  media,
  familyTree
  // Add other modules as needed for your other Edge Functions
} 