import { SupabaseClient } from '@supabase/supabase-js'
import { BaseRepository } from './base'
import { Node, Gender, RelType } from 'relatives-tree/lib/types'

// MARK: - Types

export type FamilyTreeMember = {
  id: string
  treeId: string
  userId?: string
  firstName: string
  lastName: string
  displayName: string
  dateOfBirth?: string
  dateOfDeath?: string
  gender: 'male' | 'female' | 'other'
  bio?: string
  imageUrl?: string
  phoneNumber?: string
  email?: string
  isPending: boolean
  createdAt: string
  updatedAt: string
}

export type FamilyTreeRelationship = {
  id: string
  treeId: string
  fromMemberId: string
  toMemberId: string
  relationshipType: 'parent' | 'child' | 'spouse'
  createdAt: string
  updatedAt: string
}

export type FamilyTreeAccess = {
  id: string
  treeId: string
  userId: string
  role: 'admin' | 'editor' | 'viewer'
  createdAt: string
  updatedAt: string
}

export type FamilyTreeInvitation = {
  id: string
  treeId: string
  inviterId: string
  inviteeEmail: string
  role: 'admin' | 'editor' | 'viewer'
  status: 'pending' | 'accepted' | 'rejected'
  expiresAt: string
  createdAt: string
  updatedAt: string
}

export type FamilyTree = {
  id: string
  name: string
  description?: string
  ownerId: string
  privacyLevel: 'public' | 'private' | 'shared'
  createdAt: string
  updatedAt: string
}

// MARK: - Repository

export class FamilyTreeRepository extends BaseRepository<'family_trees'> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'family_trees')
  }

  // MARK: - Tree Operations

  async create(input: Omit<FamilyTree, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await this.supabase
      .from('family_trees')
      .insert({
        name: input.name,
        description: input.description,
        owner_id: input.ownerId,
        privacy_level: input.privacyLevel
      })
      .select()
      .single()

    if (error) throw error
    return this.mapTreeResponse(data)
  }

  async getById(id: string) {
    const { data, error } = await this.supabase
      .from('family_trees')
      .select()
      .eq('id', id)
      .single()

    if (error) throw error
    return { data: data ? this.mapTreeResponse(data) : null }
  }

  async getWithMembers(id: string) {
    const { data: treeData, error: treeError } = await this.getById(id)
    if (treeError) throw treeError
    if (!treeData) return null

    const { data: membersData, error: membersError } = await this.supabase
      .rpc('get_family_tree_members', { p_tree_id: id })

    if (membersError) throw membersError

    // Convert to relatives-tree format
    const nodes: Node[] = membersData.map(member => ({
      id: member.id,
      gender: member.gender as Gender,
      parents: member.parents?.map(id => ({ id, type: 'blood' as RelType })) || [],
      children: member.children?.map(id => ({ id, type: 'blood' as RelType })) || [],
      siblings: [], // Siblings are derived from parents
      spouses: member.spouses?.map(id => ({ id, type: 'married' as RelType })) || [],
      attributes: {
        firstName: member.first_name,
        lastName: member.last_name,
        displayName: member.display_name,
        dateOfBirth: member.date_of_birth,
        dateOfDeath: member.date_of_death,
        bio: member.bio,
        imageUrl: member.image_url
      }
    }))

    return {
      ...treeData,
      nodes
    }
  }

  async getUserTrees(userId: string) {
    const { data, error } = await this.supabase
      .from('family_trees')
      .select(`
        *,
        family_tree_access (
          role
        )
      `)
      .or(`owner_id.eq.${userId},family_tree_access.user_id.eq.${userId}`)

    if (error) throw error
    return data.map(this.mapTreeResponse)
  }

  // MARK: - Member Operations

  async addMember(input: {
    treeId: string
    userId?: string
    firstName: string
    lastName: string
    displayName: string
    dateOfBirth?: string
    dateOfDeath?: string
    gender: 'male' | 'female' | 'other'
    bio?: string
    imageUrl?: string
    phoneNumber?: string
    email?: string
    isPending?: boolean
  }) {
    const { data, error } = await this.supabase
      .from('family_tree_members')
      .insert({
        tree_id: input.treeId,
        user_id: input.userId,
        first_name: input.firstName,
        last_name: input.lastName,
        display_name: input.displayName,
        date_of_birth: input.dateOfBirth,
        date_of_death: input.dateOfDeath,
        gender: input.gender,
        bio: input.bio,
        image_url: input.imageUrl,
        phone_number: input.phoneNumber,
        email: input.email,
        is_pending: input.isPending ?? true
      })
      .select()
      .single()

    if (error) throw error
    return this.mapMemberResponse(data)
  }

  async updateMember(id: string, input: Partial<Omit<FamilyTreeMember, 'id' | 'treeId' | 'createdAt' | 'updatedAt'>>) {
    const { data, error } = await this.supabase
      .from('family_tree_members')
      .update({
        user_id: input.userId,
        first_name: input.firstName,
        last_name: input.lastName,
        display_name: input.displayName,
        date_of_birth: input.dateOfBirth,
        date_of_death: input.dateOfDeath,
        gender: input.gender,
        bio: input.bio,
        image_url: input.imageUrl,
        phone_number: input.phoneNumber,
        email: input.email,
        is_pending: input.isPending
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return this.mapMemberResponse(data)
  }

  async deleteMember(id: string) {
    const { error } = await this.supabase
      .from('family_tree_members')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // MARK: - Relationship Operations

  async addRelationship(input: Omit<FamilyTreeRelationship, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await this.supabase
      .from('family_tree_relationships')
      .insert({
        tree_id: input.treeId,
        from_member_id: input.fromMemberId,
        to_member_id: input.toMemberId,
        relationship_type: input.relationshipType
      })
      .select()
      .single()

    if (error) throw error
    return this.mapRelationshipResponse(data)
  }

  async deleteRelationship(id: string) {
    const { error } = await this.supabase
      .from('family_tree_relationships')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // MARK: - Access Operations

  async addAccess(input: Omit<FamilyTreeAccess, 'id' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await this.supabase
      .from('family_tree_access')
      .insert({
        tree_id: input.treeId,
        user_id: input.userId,
        role: input.role
      })
      .select()
      .single()

    if (error) throw error
    return this.mapAccessResponse(data)
  }

  async updateAccess(id: string, role: 'admin' | 'editor' | 'viewer') {
    const { data, error } = await this.supabase
      .from('family_tree_access')
      .update({ role })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return this.mapAccessResponse(data)
  }

  async deleteAccess(id: string) {
    const { error } = await this.supabase
      .from('family_tree_access')
      .delete()
      .eq('id', id)

    if (error) throw error
  }

  // MARK: - Invitation Operations

  async createInvitation(input: Omit<FamilyTreeInvitation, 'id' | 'status' | 'createdAt' | 'updatedAt'>) {
    const { data, error } = await this.supabase
      .from('family_tree_invitations')
      .insert({
        tree_id: input.treeId,
        inviter_id: input.inviterId,
        invitee_email: input.inviteeEmail,
        role: input.role,
        expires_at: input.expiresAt
      })
      .select()
      .single()

    if (error) throw error
    return this.mapInvitationResponse(data)
  }

  async updateInvitationStatus(id: string, status: 'accepted' | 'rejected') {
    const { data, error } = await this.supabase
      .from('family_tree_invitations')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return this.mapInvitationResponse(data)
  }

  // MARK: - Response Mapping

  private mapTreeResponse(data: any): FamilyTree {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      ownerId: data.owner_id,
      privacyLevel: data.privacy_level,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  private mapMemberResponse(data: any): FamilyTreeMember {
    return {
      id: data.id,
      treeId: data.tree_id,
      userId: data.user_id,
      firstName: data.first_name,
      lastName: data.last_name,
      displayName: data.display_name,
      dateOfBirth: data.date_of_birth,
      dateOfDeath: data.date_of_death,
      gender: data.gender,
      bio: data.bio,
      imageUrl: data.image_url,
      phoneNumber: data.phone_number,
      email: data.email,
      isPending: data.is_pending,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  private mapRelationshipResponse(data: any): FamilyTreeRelationship {
    return {
      id: data.id,
      treeId: data.tree_id,
      fromMemberId: data.from_member_id,
      toMemberId: data.to_member_id,
      relationshipType: data.relationship_type,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  private mapAccessResponse(data: any): FamilyTreeAccess {
    return {
      id: data.id,
      treeId: data.tree_id,
      userId: data.user_id,
      role: data.role,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }

  private mapInvitationResponse(data: any): FamilyTreeInvitation {
    return {
      id: data.id,
      treeId: data.tree_id,
      inviterId: data.inviter_id,
      inviteeEmail: data.invitee_email,
      role: data.role,
      status: data.status,
      expiresAt: data.expires_at,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }
  }
} 