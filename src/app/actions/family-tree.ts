"use server"

import { z } from "zod"
import { createClient } from "@/lib/server/supabase"
import { withAuth } from "@/lib/server/middleware"
import { revalidatePath } from 'next/cache'
import { logger } from "@/lib/server/logger"

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
  inviteeName: z.string().optional(),
  relationship: z.string().optional(),
  message: z.string().optional(),
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
    const supabase = await createClient()

    // Call the Edge Function to create a family tree
    const { data, error } = await supabase.functions.invoke('family-tree', {
      method: 'POST',
      body: {
        action: 'create',
        data: {
          name: validated.name,
          description: validated.description,
          privacyLevel: validated.privacyLevel
        }
      }
    })

    if (error) {
      logger.error({
        msg: 'Error creating family tree via Edge Function',
        error: {
          message: error.message,
          status: error.status
        },
        input: {
          name: validated.name,
          privacyLevel: validated.privacyLevel
        }
      })

      throw new Error(`Failed to create family tree: ${error.message}`)
    }

    if (!data.success || !data.tree) {
      throw new Error('Invalid response from server')
    }

    const tree = data.tree

    revalidatePath('/family-trees')
    revalidatePath(`/family-tree/${tree.id}`)

    return { success: true, tree }
  } catch (error) {
    logger.error({
      msg: 'Failed to create family tree',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/family-tree/create'
    })

    return { error: 'Failed to create family tree' }
  }
})

// Get family tree with members
export const getFamilyTree = withAuth(async (id: string) => {
  try {
    const supabase = await createClient()
    
    // Call the Edge Function to get the family tree
    const { data, error } = await supabase.functions.invoke('family-tree', {
      method: 'POST',
      body: {
        action: 'get',
        data: {
          id
        }
      }
    })

    if (error) {
      logger.error({
        msg: 'Error fetching family tree via Edge Function',
        error: {
          message: error.message,
          status: error.status
        },
        treeId: id
      })

      throw new Error(`Failed to get family tree: ${error.message}`)
    }

    if (!data.success || !data.tree) {
      throw new Error('Invalid response from server')
    }

    return { success: true, tree: data.tree }
  } catch (error) {
    logger.error({
      msg: 'Failed to get family tree',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/family-tree/get'
    })

    return { error: 'Failed to get family tree' }
  }
})

// Get user's family trees
export const getUserFamilyTrees = withAuth(async () => {
  try {
    const supabase = await createClient()
    
    // Call the Edge Function to get user's family trees
    const { data, error } = await supabase.functions.invoke('family-tree', {
      method: 'POST',
      body: {
        action: 'get-user-trees'
      }
    })

    if (error) {
      logger.error({
        msg: 'Error fetching user family trees via Edge Function',
        error: {
          message: error.message,
          status: error.status
        }
      })

      throw new Error(`Failed to get user family trees: ${error.message}`)
    }

    if (!data.success || !data.trees) {
      throw new Error('Invalid response from server')
    }

    return { success: true, trees: data.trees }
  } catch (error) {
    logger.error({
      msg: 'Failed to get user family trees',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/family-tree/get-user-trees'
    })

    return { error: 'Failed to get family trees' }
  }
})

// Add a member to a family tree
export const addFamilyMember = withAuth(async (input: AddMemberInput) => {
  try {
    const validated = addMemberSchema.parse(input)
    const supabase = await createClient()
    
    // Call the Edge Function to add a member
    const { data, error } = await supabase.functions.invoke('family-tree', {
      method: 'POST',
      body: {
        action: 'add-member',
        data: {
          treeId: validated.treeId,
          firstName: validated.firstName,
          lastName: validated.lastName,
          displayName: `${validated.firstName} ${validated.lastName}`,
          dateOfBirth: validated.dateOfBirth,
          dateOfDeath: validated.dateOfDeath,
          gender: validated.gender,
          bio: validated.bio,
          imageUrl: validated.imageUrl,
          phoneNumber: validated.phoneNumber,
          email: validated.email
        }
      }
    })

    if (error) {
      logger.error({
        msg: 'Error adding family member via Edge Function',
        error: {
          message: error.message,
          status: error.status
        },
        treeId: validated.treeId
      })

      throw new Error(`Failed to add family member: ${error.message}`)
    }

    if (!data.success || !data.member) {
      throw new Error('Invalid response from server')
    }

    revalidatePath(`/family-tree/${validated.treeId}`)
    return { success: true, member: data.member }
  } catch (error) {
    logger.error({
      msg: 'Failed to add family member',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/family-tree/add-member'
    })

    return { error: 'Failed to add family member' }
  }
})

// Add a relationship to a family tree
export const addFamilyRelationship = withAuth(async (input: AddRelationshipInput) => {
  try {
    const validated = addRelationshipSchema.parse(input)
    const supabase = await createClient()
    
    // Call the Edge Function to add a relationship
    const { data, error } = await supabase.functions.invoke('family-tree', {
      method: 'POST',
      body: {
        action: 'add-relationship',
        data: {
          treeId: validated.treeId,
          fromMemberId: validated.fromMemberId,
          toMemberId: validated.toMemberId,
          relationshipType: validated.relationshipType
        }
      }
    })

    if (error) {
      logger.error({
        msg: 'Error adding family relationship via Edge Function',
        error: {
          message: error.message,
          status: error.status
        },
        treeId: validated.treeId
      })

      throw new Error(`Failed to add family relationship: ${error.message}`)
    }

    if (!data.success) {
      throw new Error('Invalid response from server')
    }

    revalidatePath(`/family-tree/${validated.treeId}`)
    return { success: true, relationship: data.relationship }
  } catch (error) {
    logger.error({
      msg: 'Failed to add family relationship',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/family-tree/add-relationship'
    })

    return { error: 'Failed to add family relationship' }
  }
})

// Invite member to family tree
export const inviteMember = withAuth(async (data: InviteMemberInput) => {
  try {
    // Validate input data
    const validated = inviteMemberSchema.parse(data)
    
    // Get the supabase client and current user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    // Set expiry to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Call the Edge Function to create the invitation
    const { data: invitationData, error } = await supabase.functions.invoke('invitations/create', {
      method: 'POST',
      body: {
        inviteeEmail: validated.inviteeEmail,
        inviteeName: validated.inviteeName || validated.inviteeEmail,
        relationship: validated.relationship,
        role: validated.role,
        message: validated.message,
        expiresAt: expiresAt.toISOString(),
        treeId: validated.treeId
      }
    })
    
    if (error) {
      logger.error({
        msg: 'Error from Edge Function while inviting family member',
        error: error.message,
        status: error.status
      })
      throw new Error(error.message || 'Failed to invite family member')
    }
    
    if (!invitationData.success) {
      throw new Error(invitationData.error || 'Failed to create invitation')
    }

    revalidatePath(`/family-tree/${validated.treeId}`)
    return { success: true, invitation: invitationData.invitation }
  } catch (error) {
    logger.error({
      msg: 'Failed to invite family member',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/family-tree/invite-member'
    })

    return { error: 'Failed to invite family member' }
  }
})

// Accept invitation
export const acceptInvitation = withAuth(async (invitationId: string) => {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    // Call the Edge Function to update invitation status
    const { data, error } = await supabase.functions.invoke('invitations/update', {
      method: 'POST',
      body: {
        id: invitationId,
        status: 'accepted',
        updatedFields: {
          accepted_at: new Date().toISOString(),
          user_id: user.id
        }
      }
    })
    
    if (error) {
      logger.error({
        msg: 'Error from Edge Function while accepting invitation',
        error: error.message,
        status: error.status
      })
      throw new Error(error.message || 'Failed to accept invitation')
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to accept invitation')
    }

    const invitation = data.invitation
    
    // Add user to the family tree members
    await supabase.functions.invoke('family-tree/add-member', {
      method: 'POST',
      body: {
        treeId: invitation.treeId,
        userId: user.id,
        role: invitation.role
      }
    })

    revalidatePath(`/family-tree/${invitation.treeId}`)
    return { success: true }
  } catch (error) {
    logger.error({
      msg: 'Failed to accept invitation',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/family-tree/accept-invitation'
    })

    return { error: 'Failed to accept invitation' }
  }
})

// Reject invitation
export const rejectInvitation = withAuth(async (invitationId: string) => {
  try {
    const supabase = await createClient()
    
    // Call the Edge Function to update invitation status
    const { data, error } = await supabase.functions.invoke('invitations/update', {
      method: 'POST',
      body: {
        id: invitationId,
        status: 'rejected',
        updatedFields: {
          rejected_at: new Date().toISOString()
        }
      }
    })
    
    if (error) {
      logger.error({
        msg: 'Error from Edge Function while rejecting invitation',
        error: error.message,
        status: error.status
      })
      throw new Error(error.message || 'Failed to reject invitation')
    }
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to reject invitation')
    }

    return { success: true }
  } catch (error) {
    logger.error({
      msg: 'Failed to reject invitation',
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name
      } : 'Unknown error',
      endpoint: '/family-tree/reject-invitation'
    })

    return { error: 'Failed to reject invitation' }
  }
}) 