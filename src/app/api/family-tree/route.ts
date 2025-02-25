import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server/supabase';

export const dynamic = 'force-dynamic';

// Define types for our nodes
type FamilyTreeNode = {
  id: string;
  gender: string;
  family_tree_id: string;
  user_id?: string;
  parents?: string[];
  children?: string[];
  siblings?: string[];
  spouses?: string[];
  attributes: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
    date_of_birth?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

// GET /api/family-tree
export async function GET() {
  try {
    const supabase = await createClient();
    
    if (!supabase) {
      console.error('Failed to initialize Supabase client');
      return NextResponse.json({ error: 'Failed to initialize database connection' }, { status: 500 });
    }
    
    // First get and verify the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      console.error('Auth session error:', sessionError);
      return NextResponse.json({ error: 'Authentication error', details: sessionError.message }, { status: 401 });
    }
    
    if (!session) {
      console.error('No session found');
      return NextResponse.json({ error: 'Not authenticated', reason: 'no_session' }, { status: 401 });
    }

    // Then verify the user with getUser for secure authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('Auth user error:', authError);
      return NextResponse.json({ error: 'Authentication error', details: authError.message }, { status: 401 });
    }
    
    if (!user) {
      console.error('No user found despite valid session');
      return NextResponse.json({ error: 'Not authenticated', reason: 'no_user' }, { status: 401 });
    }

    console.log('User authenticated successfully:', user.id);

    // Get the family tree id - first try to get from user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('family_tree_id')
      .eq('id', user.id)
      .single();
      
    if (userError && userError.code !== 'PGRST116') {
      console.error('Error getting user data:', userError);
      return NextResponse.json({ error: 'Error retrieving user data', details: userError.message }, { status: 500 });
    }
    
    let familyTreeId = userData?.family_tree_id;
    
    // If not found in user profile, try family_tree_access
    if (!familyTreeId) {
      const { data: accessData, error: accessError } = await supabase
        .from('family_tree_access')
        .select('tree_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
        
      if (accessError && accessError.code !== 'PGRST116') {
        console.error('Error getting family tree access:', accessError);
      } else {
        familyTreeId = accessData?.tree_id;
      }
    }
    
    // If still no family tree, try to find trees the user owns
    if (!familyTreeId) {
      const { data: ownedTrees, error: ownedError } = await supabase
        .from('family_trees')
        .select('id')
        .eq('owner_id', user.id)
        .limit(1)
        .single();
        
      if (ownedError && ownedError.code !== 'PGRST116') {
        console.error('Error getting owned trees:', ownedError);
      } else {
        familyTreeId = ownedTrees?.id;
      }
    }
    
    if (!familyTreeId) {
      console.log('No family tree found for user:', user.id);
      return NextResponse.json({ 
        error: 'No family tree found',
        action: 'create',
        trees: []
      }, { status: 404 });
    }

    console.log('Found family tree for user:', user.id, 'tree ID:', familyTreeId);

    // Get the nodes for this family tree
    const { data: nodes, error: nodesError } = await supabase
      .from('family_tree_nodes')
      .select('*')
      .eq('family_tree_id', familyTreeId);
      
    if (nodesError) {
      console.error('Error fetching family tree nodes:', nodesError);
      return NextResponse.json({ 
        error: 'Error retrieving family tree data', 
        details: nodesError.message 
      }, { status: 500 });
    }
    
    // If no nodes, return empty array
    if (!nodes || nodes.length === 0) {
      console.log('No nodes found for family tree:', familyTreeId);
      return NextResponse.json({ 
        treeId: familyTreeId,
        nodes: [] 
      });
    }

    // Get the family tree details
    const { data: treeData, error: treeError } = await supabase
      .from('family_trees')
      .select('name, description, privacy_level')
      .eq('id', familyTreeId)
      .single();
      
    if (treeError) {
      console.error('Error fetching family tree details:', treeError);
    }

    // Transform the nodes to match the expected format (if needed)
    const transformedNodes = nodes.map((node: FamilyTreeNode): FamilyTreeNode => ({
      id: node.id,
      gender: node.gender,
      family_tree_id: node.family_tree_id,
      user_id: node.user_id,
      parents: node.parents || [],
      children: node.children || [],
      spouses: node.spouses || [],
      attributes: node.attributes || {}
    }));

    return NextResponse.json({
      treeId: familyTreeId, 
      treeName: treeData?.name,
      treeDescription: treeData?.description,
      privacyLevel: treeData?.privacy_level,
      nodes: transformedNodes
    });
  } catch (error) {
    console.error('Error in family tree API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/family-tree
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // First get and verify the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error('Not authenticated');

    // Then verify the user with getUser for secure authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Not authenticated');

    // Get the request body
    const body = await request.json();
    const { userData, relationType, selectedNodeId, options } = body;

    // Create family member using RPC
    const { data, error } = await supabase.rpc('create_family_member', {
      p_user_data: userData,
      p_relation_type: relationType,
      p_selected_node_id: selectedNodeId,
      p_connect_to_children: options.connectToChildren || false,
      p_connect_to_spouse: options.connectToSpouse || false,
      p_connect_to_existing_parent: options.connectToExistingParent || false
    });

    if (error) throw error;

    return NextResponse.json({ success: true, userId: data.user_id });
  } catch (error) {
    console.error('Error creating family member:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create family member' },
      { status: 401 }
    );
  }
}

// DELETE /api/family-tree
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    
    // First get and verify the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) throw new Error('Not authenticated');

    // Then verify the user with getUser for secure authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) throw authError;
    if (!user) throw new Error('Not authenticated');

    // Get the request body
    const body = await request.json();
    const { memberId, familyTreeId } = body;

    // Delete family member using RPC
    const { error } = await supabase.rpc('delete_family_member', {
      p_member_id: memberId,
      p_family_tree_id: familyTreeId,
      p_current_user_id: user.id
    });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting family member:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete family member' },
      { status: 401 }
    );
  }
} 