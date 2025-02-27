import { createClient } from '@supabase/supabase-js';

// MARK: - Types

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

// MARK: - Client Setup

/**
 * Creates a Supabase client
 */
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase URL or anon key is not defined in environment variables');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey);
}

// MARK: - Family Tree Management

/**
 * Creates a new family tree
 */
export async function createFamilyTree({
  name,
  description,
  privacyLevel = 'private'
}: {
  name: string;
  description?: string;
  privacyLevel?: PrivacyLevel;
}): Promise<{ error?: string; familyTree?: FamilyTree }> {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.functions.invoke("create-family-tree", {
      body: {
        name,
        description,
        privacyLevel
      },
      method: 'POST'
    });
    
    if (error) {
      return { error: error.message };
    }
    
    return { familyTree: data.familyTree };
  } catch (error) {
    console.error('Error creating family tree:', error);
    return { 
      error: error instanceof Error 
        ? error.message 
        : 'Unknown error occurred while creating family tree'
    };
  }
}

/**
 * Updates an existing family tree
 */
export async function updateFamilyTree({
  id,
  name,
  description,
  privacyLevel
}: {
  id: string;
  name?: string;
  description?: string;
  privacyLevel?: PrivacyLevel;
}): Promise<{ error?: string; familyTree?: FamilyTree }> {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.functions.invoke("update-family-tree", {
      body: {
        id,
        name,
        description,
        privacyLevel
      },
      method: 'POST'
    });
    
    if (error) {
      return { error: error.message };
    }
    
    return { familyTree: data.familyTree };
  } catch (error) {
    console.error('Error updating family tree:', error);
    return { 
      error: error instanceof Error 
        ? error.message 
        : 'Unknown error occurred while updating family tree'
    };
  }
}

/**
 * Deletes a family tree
 */
export async function deleteFamilyTree(
  id: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.functions.invoke("delete-family-tree", {
      body: { id },
      method: 'POST'
    });
    
    if (error) {
      return { error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error deleting family tree:', error);
    return { 
      error: error instanceof Error 
        ? error.message 
        : 'Unknown error occurred while deleting family tree'
    };
  }
}

/**
 * Gets a family tree by ID
 */
export async function getFamilyTree(
  id: string
): Promise<{ error?: string; familyTree?: FamilyTree }> {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.functions.invoke("get-family-tree-metadata", {
      body: { id },
      method: 'POST'
    });
    
    if (error) {
      return { error: error.message };
    }
    
    return { familyTree: data.familyTree };
  } catch (error) {
    console.error('Error getting family tree:', error);
    return { 
      error: error instanceof Error 
        ? error.message 
        : 'Unknown error occurred while getting family tree'
    };
  }
}

/**
 * Gets all family trees for the current user
 */
export async function getUserFamilyTrees(): Promise<{ 
  error?: string; 
  familyTrees?: FamilyTree[] 
}> {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.functions.invoke("get-user-family-trees", {
      method: 'POST'
    });
    
    if (error) {
      return { error: error.message };
    }
    
    return { familyTrees: data.familyTrees };
  } catch (error) {
    console.error('Error getting user family trees:', error);
    return { 
      error: error instanceof Error 
        ? error.message 
        : 'Unknown error occurred while getting user family trees'
    };
  }
}

/**
 * Adds a member to a family tree
 */
export async function addMember({
  familyTreeId,
  email,
  role = 'viewer'
}: {
  familyTreeId: string;
  email: string;
  role?: MemberRole;
}): Promise<{ error?: string; success?: boolean }> {
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.functions.invoke("add-family-tree-member", {
      body: {
        familyTreeId,
        email,
        role
      },
      method: 'POST'
    });
    
    if (error) {
      return { error: error.message };
    }
    
    return { success: true };
  } catch (error) {
    console.error('Error adding member:', error);
    return { 
      error: error instanceof Error 
        ? error.message 
        : 'Unknown error occurred while adding member'
    };
  }
}

// MARK: - Family Tree Data

/**
 * Gets family tree data formatted for relatives-tree library
 */
export async function getFamilyTreeData(
  familyTreeId: string, 
  rootNodeId?: string
): Promise<{ 
  error?: string; 
  nodes?: RelativeTreeNode[]; 
  rootId?: string 
}> {
  if (!familyTreeId) {
    return { error: 'Family tree ID is required' };
  }
  
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.functions.invoke("get-family-tree", {
      body: {
        familyTreeId,
        rootNodeId
      },
      method: 'POST'
    });
    
    if (error) {
      return { error: error.message };
    }
    
    if (!data || !data.nodes) {
      return { error: 'No family tree data returned from the API' };
    }
    
    return { 
      nodes: data.nodes,
      rootId: data.rootId
    };
  } catch (error) {
    console.error('Error getting family tree data:', error);
    return { 
      error: error instanceof Error 
        ? error.message 
        : 'Unknown error occurred while getting family tree data'
    };
  }
}

/**
 * Creates a new family member and updates all related relationships
 */
export async function createFamilyMember(
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
): Promise<{ 
  error?: string; 
  newNodeId?: string;
  updatedNodes?: RelativeTreeNode[] 
}> {
  if (!userData || !userData.familyTreeId) {
    return { error: 'User data with family tree ID is required' };
  }
  
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.functions.invoke("create-family-member", {
      body: {
        userData,
        relationType,
        selectedNodeId,
        options
      },
      method: 'POST'
    });
    
    if (error) {
      return { error: error.message };
    }
    
    return { 
      newNodeId: data.newNodeId,
      updatedNodes: data.updatedNodes
    };
  } catch (error) {
    console.error('Error creating family member:', error);
    return { 
      error: error instanceof Error 
        ? error.message 
        : 'Unknown error occurred while creating family member'
    };
  }
}

/**
 * Updates family relationships between nodes
 */
export async function updateFamilyRelationships(
  nodeId: string, 
  familyTreeId: string, 
  relationships: RelationshipUpdates
): Promise<{ 
  error?: string; 
  updatedNodes?: RelativeTreeNode[] 
}> {
  if (!nodeId) {
    return { error: 'Node ID is required' };
  }
  
  if (!familyTreeId) {
    return { error: 'Family tree ID is required' };
  }
  
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.functions.invoke("update-family-relationships", {
      body: {
        nodeId,
        familyTreeId,
        relationships
      },
      method: 'POST'
    });
    
    if (error) {
      return { error: error.message };
    }
    
    return { updatedNodes: data.updatedNodes };
  } catch (error) {
    console.error('Error updating relationships:', error);
    return { 
      error: error instanceof Error 
        ? error.message 
        : 'Unknown error occurred while updating relationships'
    };
  }
}

/**
 * Deletes a family member and updates all related relationships
 */
export async function deleteFamilyMember(
  nodeId: string, 
  familyTreeId: string
): Promise<{ 
  error?: string; 
  success?: boolean;
  updatedNodes?: RelativeTreeNode[] 
}> {
  if (!nodeId) {
    return { error: 'Node ID is required' };
  }
  
  if (!familyTreeId) {
    return { error: 'Family tree ID is required' };
  }
  
  const supabase = getSupabaseClient();
  
  try {
    const { data, error } = await supabase.functions.invoke("delete-family-member", {
      body: {
        nodeId,
        familyTreeId
      },
      method: 'POST'
    });
    
    if (error) {
      return { error: error.message };
    }
    
    return { 
      success: true,
      updatedNodes: data.updatedNodes
    };
  } catch (error) {
    console.error('Error deleting family member:', error);
    return { 
      error: error instanceof Error 
        ? error.message 
        : 'Unknown error occurred while deleting family member'
    };
  }
}

// MARK: - Helper Functions for Display

/**
 * Formats tree data specifically for the relatives-tree library
 */
export function formatForRelativesTreeLibrary(
  nodes: RelativeTreeNode[]
): {
  id: string;
  gender: 'male' | 'female';
  parents: Array<{ id: string; type: string }>;
  children: Array<{ id: string; type: string }>;
  siblings: Array<{ id: string; type: string }>;
  spouses: Array<{ id: string; type: string }>;
  attributes?: {
    displayName: string;
    [key: string]: unknown;
  };
}[] {
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