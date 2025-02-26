import { createClient } from '@supabase/supabase-js';

// Types copied from server for client usage
export enum Gender {
  male = 'male',
  female = 'female',
}

export enum RelType {
  blood = 'blood',
  married = 'married',
  divorced = 'divorced',
  adopted = 'adopted',
  half = 'half',
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

export interface UserData {
  familyTreeId: string;
  userId?: string;
  memberId?: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  gender: string;
  attributes?: Record<string, unknown>;
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
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Define a type that matches what the relatives-tree library expects
export interface RelativesTreeLibNode {
  id: string;
  gender: 'male' | 'female';
  parents: Array<{ id: string; type: string }>;
  children: Array<{ id: string; type: string }>;
  siblings: Array<{ id: string; type: string }>;
  spouses: Array<{ id: string; type: string }>;
  attributes?: {
    displayName: string;
    familyTreeId?: string;
    isBloodRelated?: boolean;
    profilePicture?: string;
    status?: string;
    treeOwnerId?: string;
    [key: string]: unknown;
  };
}

/**
 * Converts API node format to the exact format expected by the relatives-tree library
 * @param nodes - Nodes from the API
 * @returns Nodes formatted for the relatives-tree library
 */
export function convertToRelativesTreeFormat(nodes: RelativeTreeNode[]): RelativesTreeLibNode[] {
  if (!nodes || nodes.length === 0) {
    return [];
  }

  return nodes.map(node => {
    // Ensure gender is exactly 'male' or 'female' as expected by the library
    const gender = node.gender === Gender.male ? 'male' : 'female';
    
    // Create a properly formatted attributes object
    const attributes = {
      displayName: node.attributes?.displayName as string || node.id,
      familyTreeId: node.attributes?.familyTreeId as string || '',
      isBloodRelated: node.attributes?.isBloodRelated as boolean || false,
      profilePicture: node.attributes?.profilePicture as string || undefined,
      status: node.attributes?.status as string || undefined,
      treeOwnerId: node.attributes?.treeOwnerId as string || undefined,
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

/**
 * Gets family tree data formatted for relatives-tree library
 */
export async function getFamilyTreeData(familyTreeId: string, rootNodeId?: string) {
  if (!familyTreeId) {
    throw new Error('Family tree ID is required');
  }
  
  const supabase = getSupabaseClient();
  
  try {
    // Call the get-family-tree edge function
    const { data, error } = await supabase.functions.invoke("get-family-tree", {
      body: {
        familyTreeId,
        rootNodeId
      },
      method: 'POST'
    });
    
    if (error) {
      console.error('Error fetching family tree data:', error);
      throw new Error(`Failed to fetch family tree data: ${error.message}`);
    }
    
    if (!data || !data.nodes) {
      throw new Error('No family tree data returned from the API');
    }
    
    return data as { nodes: RelativeTreeNode[]; rootId: string };
  } catch (error) {
    console.error('Error in getFamilyTreeData:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Unknown error occurred while fetching family tree data');
  }
}

/**
 * Updates the family tree relationships
 */
export async function updateFamilyRelationships(nodeId: string, familyTreeId: string, relationships: RelationshipUpdates) {
  if (!nodeId) {
    throw new Error('Node ID is required');
  }
  
  if (!familyTreeId) {
    throw new Error('Family tree ID is required');
  }
  
  const supabase = getSupabaseClient();
  
  try {
    // Call the update-family-relationships edge function
    const { data, error } = await supabase.functions.invoke("update-family-relationships", {
      body: {
        nodeId,
        familyTreeId,
        relationships
      },
      method: 'POST'
    });
    
    if (error) {
      console.error('Error updating relationships:', error);
      throw new Error(`Failed to update relationships: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error in updateFamilyRelationships:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Unknown error occurred while updating relationships');
  }
}

/**
 * Creates a new family member and updates all related relationships
 */
export async function createFamilyMember(
  userData: UserData,
  relationType: 'parent' | 'child' | 'spouse' | 'sibling',
  selectedNodeId: string,
  options?: CreateMemberOptions
) {
  if (!userData || !userData.familyTreeId) {
    throw new Error('User data with family tree ID is required');
  }
  
  if (!relationType) {
    throw new Error('Relationship type is required');
  }
  
  if (!selectedNodeId) {
    throw new Error('Selected node ID is required');
  }
  
  const supabase = getSupabaseClient();
  
  try {
    // Call the create-family-member edge function
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
      console.error('Error creating family member:', error);
      throw new Error(`Failed to create family member: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error in createFamilyMember:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Unknown error occurred while creating family member');
  }
}

/**
 * Deletes a family member and updates all related relationships
 */
export async function deleteFamilyMember(nodeId: string, familyTreeId: string) {
  if (!nodeId) {
    throw new Error('Node ID is required');
  }
  
  if (!familyTreeId) {
    throw new Error('Family tree ID is required');
  }
  
  const supabase = getSupabaseClient();
  
  try {
    // Call the delete-family-member edge function
    const { data, error } = await supabase.functions.invoke("delete-family-member", {
      body: {
        nodeId,
        familyTreeId
      },
      method: 'POST'
    });
    
    if (error) {
      console.error('Error deleting family member:', error);
      throw new Error(`Failed to delete family member: ${error.message}`);
    }
    
    return data;
  } catch (error) {
    console.error('Error in deleteFamilyMember:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Unknown error occurred while deleting family member');
  }
}

/**
 * Converts family tree data for use with relatives-tree library
 */
export function processFamilyTreeForDisplay(treeData: { nodes: RelativeTreeNode[]; rootId: string }) {
  try {
    if (!treeData || !treeData.nodes || !treeData.rootId) {
      throw new Error('Invalid tree data structure');
    }
    
    // Convert nodes to the format expected by the relatives-tree library
    const convertedNodes = convertToRelativesTreeFormat(treeData.nodes);
    
    return {
      nodes: convertedNodes,
      rootId: treeData.rootId
    };
  } catch (error) {
    console.error('Error processing family tree data:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Unknown error occurred while processing family tree data');
  }
}