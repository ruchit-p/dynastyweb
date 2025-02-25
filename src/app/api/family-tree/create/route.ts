import { NextResponse } from 'next/server';
import { createClient } from '@/lib/server/supabase';

export async function POST() {
  try {
    // Create a Supabase client
    const supabase = await createClient();

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('Authentication error:', userError);
      return NextResponse.json(
        { error: 'Authentication error' },
        { status: 401 }
      );
    }

    // Get user profile to ensure we have name information
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('first_name, last_name, gender')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error getting user profile:', profileError);
      return NextResponse.json(
        { error: 'Failed to get user profile' },
        { status: 500 }
      );
    }

    // Start a transaction to ensure all operations succeed or fail together
    const { error: beginTxnError } = await supabase.rpc('begin_transaction');
    if (beginTxnError) {
      console.error('Transaction start error:', beginTxnError);
      return NextResponse.json(
        { error: 'Failed to start transaction' },
        { status: 500 }
      );
    }

    try {
      // 1. Create new family tree
      const { data: treeData, error: treeError } = await supabase
        .from('family_trees')
        .insert({
          name: `${profile.first_name}'s Family Tree`,
          owner_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (treeError) {
        console.error('Family tree creation error:', treeError);
        throw treeError;
      }

      // 2. Update user with family tree ID
      const { error: updateError } = await supabase
        .from('users')
        .update({ family_tree_id: treeData.id })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user with family tree ID:', updateError);
        throw updateError;
      }

      // 3. Grant owner admin access in family_tree_access table
      const { error: accessError } = await supabase
        .from('family_tree_access')
        .insert({
          tree_id: treeData.id,
          user_id: user.id,
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (accessError) {
        console.error('Error creating family tree access record:', accessError);
        throw accessError;
      }

      // 4. Add user as a member of their own family tree
      const { error: nodeError } = await supabase
        .from('family_tree_nodes')
        .insert({
          family_tree_id: treeData.id,
          user_id: user.id,
          gender: profile.gender || 'other',
          attributes: {
            first_name: profile.first_name,
            last_name: profile.last_name,
            display_name: `${profile.first_name} ${profile.last_name}`,
            familyTreeId: treeData.id,
            isBloodRelated: true,
            treeOwnerId: user.id
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (nodeError) {
        console.error('Error creating family tree node:', nodeError);
        throw nodeError;
      }

      // 5. Create history book
      const { data: historyBookData, error: historyBookError } = await supabase
        .from('history_books')
        .insert({
          title: `${profile.first_name}'s History Book`,
          description: `A collection of stories and memories for ${profile.first_name} ${profile.last_name}`,
          family_tree_id: treeData.id,
          owner_id: user.id,
          privacy_level: 'personal',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (historyBookError) {
        console.error('History book creation error:', historyBookError);
        throw historyBookError;
      }

      // 6. Update user with history book ID
      const { error: updateHistoryBookError } = await supabase
        .from('users')
        .update({ history_book_id: historyBookData.id })
        .eq('id', user.id);

      if (updateHistoryBookError) {
        console.error('Error updating user with history book ID:', updateHistoryBookError);
        throw updateHistoryBookError;
      }

      // Commit the transaction
      const { error: commitError } = await supabase.rpc('commit_transaction');
      if (commitError) {
        console.error('Transaction commit error:', commitError);
        throw commitError;
      }

      return NextResponse.json({
        success: true,
        treeId: treeData.id,
        historyBookId: historyBookData.id
      });
    } catch (error) {
      // Rollback transaction on any error
      const { error: rollbackError } = await supabase.rpc('rollback_transaction');
      if (rollbackError) {
        console.error('Transaction rollback error:', rollbackError);
      }
      
      console.error('Error in family tree/history book creation:', error);
      return NextResponse.json(
        { error: 'Failed to create family tree and history book' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
} 