'use client'

import { useCallback, useState } from 'react'
import { toast } from '@/components/ui/use-toast'
import {
  updateFamilyRelationships,
  updateDataRetention,
  uploadProfilePicture,
  updateProfile
} from '@/app/actions/users'
import { useAuth } from '@/components/auth'
import type { UpdateProfileInput } from '@/app/actions/users'

// Import actions indirectly as a workaround for TypeScript inference issues with withAuth
import * as userActions from '@/app/actions/users'

interface UseUserOptions {
  onSuccess?: () => void
  onError?: (error: unknown) => void
}

// MARK: - Types
type ApiError = {
  message: string
}

type ProfilePictureResult = {
  success?: boolean;
  profilePictureUrl?: string;
  error?: string;
}

type FamilyMembersResult = {
  success?: boolean;
  members?: unknown[];
  error?: string;
}

// MARK: - Hook
export function useUser(options: UseUserOptions = {}) {
  const { currentUser: user } = useAuth()
  const [loading, setLoading] = useState(false)

  // Helper to handle errors
  const handleError = useCallback((error: unknown) => {
    console.error('User operation error:', error)
    toast({
      title: 'Error',
      description: error instanceof Error ? error.message : 'An unexpected error occurred',
      variant: 'destructive',
    })
    options.onError?.(error)
  }, [options])

  // MARK: - User Methods
  const updateUserProfile = useCallback(async (data: UpdateProfileInput) => {
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
      const result = await updateProfile(data)
      
      if ('error' in result) {
        throw new Error(result.error)
      }

      toast({
        title: 'Success!',
        description: 'Profile updated successfully.',
      })

      options.onSuccess?.()
      return result.data
    } catch (error) {
      handleError(error)
      return null
    } finally {
      setLoading(false)
    }
  }, [user, options, handleError])

  // Use the server action for profile picture upload
  const handleUploadProfilePicture = useCallback(async (file: File) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to upload a profile picture',
      })
      return
    }

    setLoading(true)
    try {
      const result = await uploadProfilePicture(file) as ProfilePictureResult
      
      if ('error' in result) {
        throw new Error(result.error)
      }

      toast({
        title: 'Success',
        description: 'Profile picture uploaded successfully',
      })

      options.onSuccess?.()
      return result.profilePictureUrl
    } catch (error) {
      handleError(error)
      return null
    } finally {
      setLoading(false)
    }
  }, [user, options, handleError])

  // Use the server action for profile picture deletion
  const handleDeleteProfilePicture = useCallback(async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'You must be logged in to delete your profile picture',
      })
      return
    }

    setLoading(true)
    try {
      // @ts-expect-error - Server action doesn't actually need arguments despite TypeScript inference
      const result = await userActions.deleteProfilePicture() as {success?: boolean; error?: string}
      
      if ('error' in result) {
        throw new Error(result.error)
      }

      toast({
        title: 'Success',
        description: 'Profile picture deleted successfully',
      })

      options.onSuccess?.()
      return true
    } catch (error) {
      handleError(error)
      return false
    } finally {
      setLoading(false)
    }
  }, [user, options, handleError])

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

  // Get family members
  const getFamilyMembersList = useCallback(async () => {
    try {
      setLoading(true)
      // @ts-expect-error - Server action doesn't actually need arguments despite TypeScript inference
      const result = await userActions.getFamilyMembers() as FamilyMembersResult
      
      if ('error' in result) {
        throw new Error(result.error)
      }
      
      return result.members || []
    } catch (error) {
      handleError(error)
      return []
    } finally {
      setLoading(false)
    }
  }, [handleError])

  // Update family relationships
  const updateRelationships = useCallback(async (relationships: {
    parentIds?: string[]
    childrenIds?: string[]
    spouseIds?: string[]
  }) => {
    try {
      setLoading(true)
      const result = await updateFamilyRelationships(relationships)
      
      if ('error' in result) {
        throw new Error(result.error)
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
  }, [options, handleError])

  // Update data retention
  const updateRetention = useCallback(async (period: 'forever' | 'year' | 'month' | 'week') => {
    try {
      setLoading(true)
      const result = await updateDataRetention(period)
      
      if ('error' in result) {
        throw new Error(result.error)
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
  }, [options, handleError])

  return {
    loading,
    updateProfile: updateUserProfile,
    uploadProfilePicture: handleUploadProfilePicture,
    deleteProfilePicture: handleDeleteProfilePicture,
    getFamilyMembers: getFamilyMembersList,
    updateRelationships,
    updateRetention,
    deleteAccount,
  }
} 