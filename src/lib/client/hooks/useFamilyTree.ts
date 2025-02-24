import { useCallback, useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import { useAuth } from './useAuth'
import {
  createFamilyTree,
  updateFamilyTree,
  deleteFamilyTree,
  addMember,
  getFamilyTree,
  getUserFamilyTrees,
} from '@/app/actions/family-tree'

// MARK: - Types
export type FamilyMember = {
  id: string
  full_name: string
  avatar_url?: string
  role: 'admin' | 'editor' | 'viewer'
}

export type FamilyTree = {
  id: string
  name: string
  description?: string
  owner_id: string
  created_at: string
  updated_at: string
  privacy_level: 'private' | 'shared' | 'public'
  owner: {
    id: string
    full_name: string
    avatar_url?: string
  }
  members: {
    user: {
      id: string
      full_name: string
      avatar_url?: string
    }
    role: 'admin' | 'editor' | 'viewer'
  }[]
}

type CreateFamilyTreeData = {
  name: string
  description?: string
  privacyLevel: 'private' | 'shared' | 'public'
}

type UpdateFamilyTreeData = {
  id: string
  name?: string
  description?: string
  privacyLevel?: 'private' | 'shared' | 'public'
}

type AddMemberData = {
  familyTreeId: string
  email: string
  role: 'viewer' | 'editor' | 'admin'
}

type FamilyTreeResponse = {
  role: 'admin' | 'editor' | 'viewer'
  family_tree: {
    id: string
    name: string
    description: string | null
    privacy_level: 'private' | 'shared' | 'public'
    owner: {
      id: string
      full_name: string
      avatar_url: string | null
    }
    created_at: string
    updated_at: string
  }
}

// MARK: - Hook
export function useFamilyTree() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [trees, setTrees] = useState<FamilyTree[]>([])
  const [currentTree, setCurrentTree] = useState<FamilyTree | null>(null)

  // MARK: - Tree Methods
  const create = useCallback(async (data: CreateFamilyTreeData) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to create a family tree',
      })
      return
    }

    setLoading(true)
    try {
      const result = await createFamilyTree({
        name: data.name,
        description: data.description,
        privacyLevel: data.privacyLevel,
      })
      
      if ('error' in result) {
        throw new Error(result.error)
      }

      toast({
        title: 'Success!',
        description: 'Family tree created successfully.',
      })

      return result.familyTree
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create family tree',
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  const update = useCallback(async ({ id, ...data }: UpdateFamilyTreeData) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to update a family tree',
      })
      return
    }

    setLoading(true)
    try {
      const result = await updateFamilyTree({ id, ...data })
      
      if ('error' in result) {
        throw new Error(result.error)
      }

      toast({
        title: 'Success!',
        description: 'Family tree updated successfully.',
      })

      if (currentTree?.id === id) {
        setCurrentTree(result.familyTree)
      }
      return result.familyTree
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update family tree',
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [user, currentTree])

  const remove = useCallback(async (id: string) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to delete a family tree',
      })
      return
    }

    setLoading(true)
    try {
      const result = await deleteFamilyTree(id)
      
      if ('error' in result) {
        throw new Error(result.error)
      }

      toast({
        title: 'Success!',
        description: 'Family tree deleted successfully.',
      })

      if (currentTree?.id === id) {
        setCurrentTree(null)
      }
      setTrees(prev => prev.filter(tree => tree.id !== id))
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete family tree',
      })
    } finally {
      setLoading(false)
    }
  }, [user, currentTree])

  const inviteMember = useCallback(async (data: AddMemberData) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to invite members',
      })
      return
    }

    setLoading(true)
    try {
      const result = await addMember({
        familyTreeId: data.familyTreeId,
        email: data.email,
        role: data.role,
      })
      
      if ('error' in result) {
        throw new Error(result.error)
      }

      toast({
        title: 'Success!',
        description: 'Invitation sent successfully.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to invite member',
      })
    } finally {
      setLoading(false)
    }
  }, [user])

  const loadTree = useCallback(async (id: string) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to view family trees',
      })
      return
    }

    setLoading(true)
    try {
      const result = await getFamilyTree(id)
      
      if ('error' in result) {
        throw new Error(result.error)
      }

      setCurrentTree(result.familyTree)
      return result.familyTree
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load family tree',
      })
      return null
    } finally {
      setLoading(false)
    }
  }, [user])

  const loadUserTrees = useCallback(async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to view family trees',
      })
      return
    }

    setLoading(true)
    try {
      const result = await getUserFamilyTrees()
      
      if ('error' in result) {
        throw new Error(result.error)
      }

      // Transform the data structure
      const transformedTrees: FamilyTree[] = (result.familyTrees || [])
        .filter((item): item is { role: string; family_tree: any } => (
          item &&
          typeof item === 'object' &&
          'family_tree' in item &&
          item.family_tree &&
          typeof item.family_tree === 'object'
        ))
        .map(item => {
          const tree = item.family_tree
          return {
            id: String(tree.id),
            name: String(tree.name),
            description: tree.description ? String(tree.description) : undefined,
            owner_id: String(tree.owner?.id),
            created_at: String(tree.created_at),
            updated_at: String(tree.updated_at),
            privacy_level: (tree.privacy_level || 'private') as 'private' | 'shared' | 'public',
            owner: {
              id: String(tree.owner?.id),
              full_name: String(tree.owner?.full_name),
              avatar_url: tree.owner?.avatar_url ? String(tree.owner.avatar_url) : undefined,
            },
            members: [], // We'll load members when viewing a specific tree
          }
        })

      setTrees(transformedTrees)
      return transformedTrees
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load family trees',
      })
      return []
    } finally {
      setLoading(false)
    }
  }, [user])

  return {
    loading,
    trees,
    currentTree,
    create,
    update,
    remove,
    inviteMember,
    loadTree,
    loadUserTrees,
  }
} 