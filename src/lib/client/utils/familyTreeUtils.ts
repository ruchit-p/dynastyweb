import { Node, Gender, RelType } from 'relatives-tree/lib/types'

// MARK: - Types

export interface FamilyMember {
  id: string
  firstName: string
  lastName: string
  displayName: string
  gender: 'male' | 'female' | 'other'
  dateOfBirth?: string
  dateOfDeath?: string
  bio?: string
  imageUrl?: string
  parents: string[]
  children: string[]
  spouses: string[]
}

export interface FamilyTree {
  id: string
  name: string
  description?: string
  ownerId: string
  privacyLevel: 'public' | 'private' | 'shared'
  createdAt: string
  updatedAt: string
  nodes: Node[]
}

// MARK: - Helper Functions

/**
 * Converts a family member to a relatives-tree node
 */
function memberToNode(member: FamilyMember): Node {
  return {
    id: member.id,
    gender: member.gender as Gender,
    parents: member.parents.map(id => ({ id, type: 'blood' as RelType })),
    children: member.children.map(id => ({ id, type: 'blood' as RelType })),
    siblings: [], // Siblings are derived from parents
    spouses: member.spouses.map(id => ({ id, type: 'married' as RelType })),
    attributes: {
      firstName: member.firstName,
      lastName: member.lastName,
      displayName: member.displayName,
      dateOfBirth: member.dateOfBirth,
      dateOfDeath: member.dateOfDeath,
      bio: member.bio,
      imageUrl: member.imageUrl
    }
  }
}

// MARK: - Main Functions

/**
 * Creates a new family tree
 */
export async function createFamilyTree(name: string, description?: string, privacyLevel: 'public' | 'private' | 'shared' = 'private'): Promise<FamilyTree> {
  const response = await fetch('/api/family-tree', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ name, description, privacyLevel })
  })

  if (!response.ok) {
    throw new Error('Failed to create family tree')
  }

  const { tree } = await response.json()
  return tree
}

/**
 * Gets a family tree by ID
 */
export async function getFamilyTree(id: string): Promise<FamilyTree> {
  const response = await fetch(`/api/family-tree/${id}`)

  if (!response.ok) {
    throw new Error('Failed to get family tree')
  }

  const { tree } = await response.json()
  return tree
}

/**
 * Gets all family trees for the current user
 */
export async function getUserFamilyTrees(): Promise<FamilyTree[]> {
  const response = await fetch('/api/family-trees')

  if (!response.ok) {
    throw new Error('Failed to get family trees')
  }

  const { trees } = await response.json()
  return trees
}

/**
 * Adds a new member to a family tree
 */
export async function addFamilyMember(input: {
  treeId: string
  firstName: string
  lastName: string
  dateOfBirth?: string
  dateOfDeath?: string
  gender: 'male' | 'female' | 'other'
  bio?: string
  imageUrl?: string
  phoneNumber?: string
  email?: string
}): Promise<FamilyMember> {
  const response = await fetch('/api/family-tree/member', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  })

  if (!response.ok) {
    throw new Error('Failed to add family member')
  }

  const { member } = await response.json()
  return member
}

/**
 * Adds a relationship between two family members
 */
export async function addFamilyRelationship(input: {
  treeId: string
  fromMemberId: string
  toMemberId: string
  relationshipType: 'parent' | 'child' | 'spouse'
}): Promise<void> {
  const response = await fetch('/api/family-tree/relationship', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  })

  if (!response.ok) {
    throw new Error('Failed to add relationship')
  }
}

/**
 * Invites a new member to a family tree
 */
export async function inviteFamilyMember(input: {
  treeId: string
  inviteeEmail: string
  role: 'admin' | 'editor' | 'viewer'
}): Promise<void> {
  const response = await fetch('/api/family-tree/invite', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(input)
  })

  if (!response.ok) {
    throw new Error('Failed to invite member')
  }
}

/**
 * Accepts a family tree invitation
 */
export async function acceptInvitation(invitationId: string): Promise<void> {
  const response = await fetch(`/api/family-tree/invite/${invitationId}/accept`, {
    method: 'POST'
  })

  if (!response.ok) {
    throw new Error('Failed to accept invitation')
  }
}

/**
 * Rejects a family tree invitation
 */
export async function rejectInvitation(invitationId: string): Promise<void> {
  const response = await fetch(`/api/family-tree/invite/${invitationId}/reject`, {
    method: 'POST'
  })

  if (!response.ok) {
    throw new Error('Failed to reject invitation')
  }
} 