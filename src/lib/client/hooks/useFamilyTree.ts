import { useCallback, useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import { useAuth } from '@/components/auth/AuthContext'
import {
  FamilyTree,
  createFamilyTree as apiCreateFamilyTree,
  updateFamilyTree as apiUpdateFamilyTree,
  deleteFamilyTree as apiDeleteFamilyTree,
  addMember as apiAddMember,
  getFamilyTree as apiGetFamilyTree,
  getUserFamilyTrees as apiGetUserFamilyTrees,
  PrivacyLevel,
  MemberRole
} from '@/lib/api/familyTreeApi'

// MARK: - Types
export type { FamilyTree, MemberRole, PrivacyLevel } from '@/lib/api/familyTreeApi'

type CreateFamilyTreeData = {
  name: string
  description?: string
  privacyLevel: PrivacyLevel
}

type UpdateFamilyTreeData = {
  id: string
  name?: string
  description?: string
  privacyLevel?: PrivacyLevel
}

type AddMemberData = {
  familyTreeId: string
  email: string
  role: MemberRole
}

// MARK: - Hook
export function useFamilyTree() {
  const { currentUser: user } = useAuth()
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
      const result = await apiCreateFamilyTree({
        name: data.name,
        description: data.description,
        privacyLevel: data.privacyLevel,
      })
      
      if (result.error) {
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
      const result = await apiUpdateFamilyTree({ id, ...data })
      
      if (result.error) {
        throw new Error(result.error)
      }

      toast({
        title: 'Success!',
        description: 'Family tree updated successfully.',
      })

      if (currentTree?.id === id && result.familyTree) {
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
      const result = await apiDeleteFamilyTree(id)
      
      if (result.error) {
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
      const result = await apiAddMember({
        familyTreeId: data.familyTreeId,
        email: data.email,
        role: data.role,
      })
      
      if (result.error) {
        throw new Error(result.error)
      }

      toast({
        title: 'Success!',
        description: 'Invitation sent successfully.',
      })
      
      return { success: true }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to invite member',
      })
      return { success: false }
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
      const result = await apiGetFamilyTree(id)
      
      if (result.error) {
        throw new Error(result.error)
      }

      if (result.familyTree) {
        setCurrentTree(result.familyTree)
      }
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
      return []
    }

    setLoading(true)
    try {
      const result = await apiGetUserFamilyTrees()
      
      if (result.error) {
        throw new Error(result.error)
      }

      const familyTrees = result.familyTrees || []
      setTrees(familyTrees)
      
      return familyTrees
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