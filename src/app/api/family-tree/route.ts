import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { Database } from '@/lib/shared/types/supabase';

export const dynamic = 'force-dynamic';

// GET /api/family-tree
export async function GET() {
  try {
    // Get cookie store
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database, 'public'>({ 
      cookies: () => cookieStore 
    });
    
    // First get and verify the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (!session) throw new Error('Not authenticated')

    // Then verify the user with getUser for secure authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(session.access_token)
    if (authError) throw authError
    if (!user) throw new Error('Not authenticated')

    // Get user's family tree ID
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('family_tree_id')
      .eq('id', user.id)
      .single()

    if (userDataError) throw userDataError
    if (!userData?.family_tree_id) throw new Error('No family tree found')

    // Get family tree data
    const { data: treeData, error: treeError } = await supabase
      .from('family_trees')
      .select('*')
      .eq('id', userData.family_tree_id)
      .single()

    if (treeError) throw treeError

    // Get family tree nodes
    const { data: nodes, error: nodesError } = await supabase
      .from('family_tree_nodes')
      .select(`
        id,
        user_id,
        parents,
        children,
        spouses,
        gender,
        attributes
      `)
      .eq('family_tree_id', userData.family_tree_id)

    if (nodesError) throw nodesError
    if (!nodes) throw new Error('Failed to fetch family tree nodes')

    // Transform nodes with type safety
    const transformedNodes = nodes.map(node => ({
      id: node.id,
      user_id: node.user_id,
      gender: node.gender,
      parents: Array.isArray(node.parents) ? node.parents : [],
      children: Array.isArray(node.children) ? node.children : [],
      spouses: Array.isArray(node.spouses) ? node.spouses : [],
      attributes: {
        ...(node.attributes as Record<string, unknown>),
        familyTreeId: userData.family_tree_id
      }
    }))

    return NextResponse.json({ 
      tree: treeData,
      nodes: transformedNodes
    })
  } catch (error) {
    console.error('Error fetching family tree:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch family tree' },
      { status: 401 }
    );
  }
}

// POST /api/family-tree
export async function POST(request: Request) {
  try {
    // Get cookie store
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database, 'public'>({ 
      cookies: () => cookieStore 
    });
    
    // First get and verify the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (!session) throw new Error('Not authenticated')

    // Then verify the user with getUser for secure authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(session.access_token)
    if (authError) throw authError
    if (!user) throw new Error('Not authenticated')

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
    // Get cookie store
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient<Database, 'public'>({ 
      cookies: () => cookieStore 
    });
    
    // First get and verify the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError
    if (!session) throw new Error('Not authenticated')

    // Then verify the user with getUser for secure authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(session.access_token)
    if (authError) throw authError
    if (!user) throw new Error('Not authenticated')

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