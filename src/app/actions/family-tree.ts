"use server"

import { z } from "zod"
import { createServerSupabaseClient } from "@/lib/server/supabase-admin"
import { withAuth } from "@/lib/server/middleware"
import { revalidatePath } from 'next/cache'
import { FamilyTreeRepository } from '@/lib/server/repositories/family-tree'

// Input validation schemas
const privacyLevelSchema = z.enum(['public', 'private', 'shared'])

const createFamilyTreeSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  privacyLevel: privacyLevelSchema
})

const addMemberSchema = z.object({
  treeId: z.string().uuid(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  dateOfBirth: z.string().optional(),
  dateOfDeath: z.string().optional(),
  gender: z.enum(['male', 'female', 'other']),
  bio: z.string().max(500).optional(),
  imageUrl: z.string().url().optional(),
  phoneNumber: z.string().optional(),
  email: z.string().email().optional()
})

const addRelationshipSchema = z.object({
  treeId: z.string().uuid(),
  fromMemberId: z.string().uuid(),
  toMemberId: z.string().uuid(),
  relationshipType: z.enum(['parent', 'child', 'spouse'])
})

const inviteMemberSchema = z.object({
  treeId: z.string().uuid(),
  inviteeEmail: z.string().email(),
  role: z.enum(['admin', 'editor', 'viewer'])
})

// MARK: - Types
export type CreateFamilyTreeInput = z.infer<typeof createFamilyTreeSchema>
export type AddMemberInput = z.infer<typeof addMemberSchema>
export type AddRelationshipInput = z.infer<typeof addRelationshipSchema>
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>

// Create a new family tree
export const createFamilyTree = withAuth(async (input: CreateFamilyTreeInput) => {
  try {
    const validated = createFamilyTreeSchema.parse(input)
    const supabase = createServerSupabaseClient()
    const repository = new FamilyTreeRepository(supabase)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    const tree = await repository.create({
      name: validated.name,
      description: validated.description,
      ownerId: user.id,
      privacyLevel: validated.privacyLevel
    })

    // Add owner as admin member
    await repository.addAccess({
      treeId: tree.id,
      userId: user.id,
      role: 'admin'
    })

    // Add owner as first member
    await repository.addMember({
      treeId: tree.id,
      userId: user.id,
      firstName: user.user_metadata.first_name || '',
      lastName: user.user_metadata.last_name || '',
      displayName: user.user_metadata.full_name || `${user.user_metadata.first_name} ${user.user_metadata.last_name}`,
      gender: 'other',
      isPending: false
    })

    revalidatePath('/family-trees')
    revalidatePath(`/family-tree/${tree.id}`)

    return { success: true, tree }
  } catch (error) {
    console.error('Create family tree error:', error)
    return { error: 'Failed to create family tree' }
  }
})

// Get family tree with members
export const getFamilyTree = withAuth(async (id: string) => {
  try {
    const supabase = createServerSupabaseClient()
    const repository = new FamilyTreeRepository(supabase)

    const tree = await repository.getWithMembers(id)
    if (!tree) throw new Error('Family tree not found')

    return { success: true, tree }
  } catch (error) {
    console.error('Get family tree error:', error)
    return { error: 'Failed to get family tree' }
  }
})

// Get user's family trees
export const getUserFamilyTrees = withAuth(async () => {
  try {
    const supabase = createServerSupabaseClient()
    const repository = new FamilyTreeRepository(supabase)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    const trees = await repository.getUserTrees(user.id)
    return { success: true, trees }
  } catch (error) {
    console.error('Get user family trees error:', error)
    return { error: 'Failed to get family trees' }
  }
})

// Add a member to a family tree
export const addFamilyMember = withAuth(async (input: AddMemberInput) => {
  try {
    const validated = addMemberSchema.parse(input)
    const supabase = createServerSupabaseClient()
    const repository = new FamilyTreeRepository(supabase)

    const member = await repository.addMember({
      ...validated,
      displayName: `${validated.firstName} ${validated.lastName}`
    })

    revalidatePath(`/family-tree/${validated.treeId}`)
    return { success: true, member }
  } catch (error) {
    console.error('Add family member error:', error)
    return { error: 'Failed to add family member' }
  }
})

// Add a relationship to a family tree
export const addFamilyRelationship = withAuth(async (input: AddRelationshipInput) => {
  try {
    const validated = addRelationshipSchema.parse(input)
    const supabase = createServerSupabaseClient()
    const repository = new FamilyTreeRepository(supabase)

    const relationship = await repository.addRelationship(validated)

    // If adding a spouse relationship, add the reverse relationship
    if (validated.relationshipType === 'spouse') {
      await repository.addRelationship({
        treeId: validated.treeId,
        fromMemberId: validated.toMemberId,
        toMemberId: validated.fromMemberId,
        relationshipType: 'spouse'
      })
    }

    // If adding a parent relationship, add the reverse child relationship
    if (validated.relationshipType === 'parent') {
      await repository.addRelationship({
        treeId: validated.treeId,
        fromMemberId: validated.toMemberId,
        toMemberId: validated.fromMemberId,
        relationshipType: 'child'
      })
    }

    // If adding a child relationship, add the reverse parent relationship
    if (validated.relationshipType === 'child') {
      await repository.addRelationship({
        treeId: validated.treeId,
        fromMemberId: validated.toMemberId,
        toMemberId: validated.fromMemberId,
        relationshipType: 'parent'
      })
    }

    revalidatePath(`/family-tree/${validated.treeId}`)
    return { success: true, relationship }
  } catch (error) {
    console.error('Add family relationship error:', error)
    return { error: 'Failed to add family relationship' }
  }
})

// Invite a member to a family tree
export const inviteFamilyMember = withAuth(async (input: InviteMemberInput) => {
  try {
    const validated = inviteMemberSchema.parse(input)
    const supabase = createServerSupabaseClient()
    const repository = new FamilyTreeRepository(supabase)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    // Set expiry to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    const invitation = await repository.createInvitation({
      treeId: validated.treeId,
      inviterId: user.id,
      inviteeEmail: validated.inviteeEmail,
      role: validated.role,
      expiresAt: expiresAt.toISOString()
    })

    revalidatePath(`/family-tree/${validated.treeId}`)
    return { success: true, invitation }
  } catch (error) {
    console.error('Invite family member error:', error)
    return { error: 'Failed to invite family member' }
  }
})

// Accept invitation
export const acceptInvitation = withAuth(async (invitationId: string) => {
  try {
    const supabase = createServerSupabaseClient()
    const repository = new FamilyTreeRepository(supabase)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    // Update invitation status
    const invitation = await repository.updateInvitationStatus(invitationId, 'accepted')

    // Add user to family tree
    await repository.addAccess({
      treeId: invitation.treeId,
      userId: user.id,
      role: invitation.role
    })

    // Add user as member
    await repository.addMember({
      treeId: invitation.treeId,
      userId: user.id,
      firstName: user.user_metadata.first_name || '',
      lastName: user.user_metadata.last_name || '',
      displayName: user.user_metadata.full_name || `${user.user_metadata.first_name} ${user.user_metadata.last_name}`,
      gender: 'other',
      isPending: false
    })

    revalidatePath(`/family-tree/${invitation.treeId}`)
    return { success: true }
  } catch (error) {
    console.error('Accept invitation error:', error)
    return { error: 'Failed to accept invitation' }
  }
})

// Reject invitation
export const rejectInvitation = withAuth(async (invitationId: string) => {
  try {
    const supabase = createServerSupabaseClient()
    const repository = new FamilyTreeRepository(supabase)

    await repository.updateInvitationStatus(invitationId, 'rejected')
    return { success: true }
  } catch (error) {
    console.error('Reject invitation error:', error)
    return { error: 'Failed to reject invitation' }
  }
}) 