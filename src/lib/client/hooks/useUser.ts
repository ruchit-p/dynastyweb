'use client'

import { useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from '@/components/ui/use-toast'
import {
  createUser,
  updateUser,
  deleteUser,
  getUserById,
  getFamilyMembers,
  updateFamilyRelationships,
  updateDataRetention,
} from '@/app/actions/users'
import type { z } from 'zod'
import type { userCreateSchema, userUpdateSchema } from '@/lib/validation/schemas'
import { useAuth } from './useAuth'
import { supabase } from '@/lib/supabase'

interface UseUserOptions {
  onSuccess?: () => void
  onError?: (error: any) => void
}

// MARK: - Types
type UpdateUserInput = z.infer<typeof userUpdateSchema>

type ApiError = {
  message: string
}

// MARK: - Hook
export function useUser(options: UseUserOptions = {}) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Helper to handle errors
  const handleError = (error: any) => {
    console.error('User operation error:', error)
    toast({
      title: 'Error',
      description: error.message || 'An unexpected error occurred',
      variant: 'destructive',
    })
    options.onError?.(error)
  }

  // MARK: - User Methods
  const updateProfile = useCallback(async (data: Partial<UpdateUserInput>) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to update your profile',
      })
      return
    }

    setLoading(true)
    try {
      const result = await updateUser(user.id, { id: user.id, ...data })
      
      if ('error' in result) {
        throw result.error
      }

      toast({
        title: 'Success!',
        description: 'Profile updated successfully.',
      })

      options.onSuccess?.()
      return result.user
    } catch (error) {
      handleError(error)
      return null
    } finally {
      setLoading(false)
    }
  }, [user, options])

  const uploadAvatar = useCallback(async (file: File) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to upload an avatar',
      })
      return
    }

    setLoading(true)
    try {
      // Upload to Supabase storage
      const fileName = `${user.id}-${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update user profile with new avatar URL
      const result = await updateUser(user.id, { 
        id: user.id,
        display_name: undefined, // Keep existing value
        phone_number: undefined, // Keep existing value
        gender: undefined, // Keep existing value
        date_of_birth: undefined, // Keep existing value
        first_name: undefined, // Keep existing value
        last_name: undefined, // Keep existing value
        email: undefined, // Keep existing value
        data_retention_period: undefined // Keep existing value
      })
      
      if ('error' in result) {
        throw result.error
      }

      toast({
        title: 'Success!',
        description: 'Avatar uploaded successfully.',
      })

      options.onSuccess?.()
      return publicUrl
    } catch (error) {
      handleError(error)
      return null
    } finally {
      setLoading(false)
    }
  }, [user, options])

  const deleteAccount = useCallback(async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to delete your account',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/users/account', {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json() as ApiError
        throw new Error(error.message)
      }

      toast({
        title: 'Account Deleted',
        description: 'Your account has been successfully deleted.',
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete account',
      })
      throw error
    } finally {
      setLoading(false)
    }
  }, [user])

  // Create user
  const create = async (data: z.infer<typeof userCreateSchema>) => {
    try {
      setLoading(true)
      const result = await createUser(data)
      
      if ('error' in result) {
        throw result.error
      }

      toast({
        title: 'Success',
        description: 'User created successfully',
      })
      
      options.onSuccess?.()
      return result.user
    } catch (error) {
      handleError(error)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Update user
  const update = async (
    userId: string,
    data: z.infer<typeof userUpdateSchema>
  ) => {
    try {
      setLoading(true)
      const result = await updateUser(userId, data)
      
      if ('error' in result) {
        throw result.error
      }

      toast({
        title: 'Success',
        description: 'User updated successfully',
      })
      
      options.onSuccess?.()
      return result.user
    } catch (error) {
      handleError(error)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Delete user
  const remove = async (userId: string) => {
    try {
      setLoading(true)
      const result = await deleteUser(userId)
      
      if ('error' in result) {
        throw result.error
      }

      toast({
        title: 'Success',
        description: 'User deleted successfully',
      })
      
      options.onSuccess?.()
      return true
    } catch (error) {
      handleError(error)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Get user by ID
  const getById = async (userId: string) => {
    try {
      setLoading(true)
      const result = await getUserById(userId)
      
      if ('error' in result) {
        throw result.error
      }
      
      return result.user
    } catch (error) {
      handleError(error)
      return null
    } finally {
      setLoading(false)
    }
  }

  // Get family members
  const getFamilyMembersList = async (userId: string) => {
    try {
      setLoading(true)
      const result = await getFamilyMembers(userId)
      
      if ('error' in result) {
        throw result.error
      }
      
      return result.members
    } catch (error) {
      handleError(error)
      return []
    } finally {
      setLoading(false)
    }
  }

  // Update family relationships
  const updateRelationships = async (
    userId: string,
    relationships: {
      parentIds?: string[]
      childrenIds?: string[]
      spouseIds?: string[]
    }
  ) => {
    try {
      setLoading(true)
      const result = await updateFamilyRelationships(userId, relationships)
      
      if ('error' in result) {
        throw result.error
      }

      toast({
        title: 'Success',
        description: 'Family relationships updated successfully',
      })
      
      options.onSuccess?.()
      return true
    } catch (error) {
      handleError(error)
      return false
    } finally {
      setLoading(false)
    }
  }

  // Update data retention
  const updateRetention = async (
    userId: string,
    period: 'forever' | 'year' | 'month' | 'week'
  ) => {
    try {
      setLoading(true)
      const result = await updateDataRetention(userId, period)
      
      if ('error' in result) {
        throw result.error
      }

      toast({
        title: 'Success',
        description: 'Data retention period updated successfully',
      })
      
      options.onSuccess?.()
      return true
    } catch (error) {
      handleError(error)
      return false
    } finally {
      setLoading(false)
    }
  }

  return {
    loading,
    create,
    update,
    remove,
    getById,
    getFamilyMembers: getFamilyMembersList,
    updateRelationships,
    updateRetention,
    updateProfile,
    uploadAvatar,
    deleteAccount,
  }
} 