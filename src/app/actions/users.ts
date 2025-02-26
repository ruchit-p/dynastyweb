'use server'

import { z } from 'zod'
import { createClient } from "@/lib/server/supabase"
import { withAuth } from "@/lib/server/middleware"
import { revalidatePath } from 'next/cache'
import { logger } from '@/lib/server/logger'
import { measureAsync } from '@/lib/performance'
import { v4 as uuidv4 } from 'uuid'
import type { ServerActionResult } from '@/lib/shared/types/actions'

// Input validation schemas
const UpdateProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  fullName: z.string().optional(),
  avatarUrl: z.string().url().optional(),
})

const updateFamilySchema = z.object({
  parentIds: z.array(z.string()).optional(),
  childrenIds: z.array(z.string()).optional(),
  spouseIds: z.array(z.string()).optional(),
})

// MARK: - Types
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
export type UpdateFamilyInput = z.infer<typeof updateFamilySchema>

// MARK: - API Functions that call Supabase Edge Functions

// MARK: - Update user profile
export const updateProfile = withAuth(async (input: UpdateProfileInput): Promise<ServerActionResult<{ success: boolean }>> => {
  const requestId = uuidv4()
  
  return await measureAsync('updateProfile', async () => {
    try {
      logger.info({
        msg: 'Starting profile update via Edge Function',
        requestId,
        inputFields: Object.keys(input),
      })
      
      // Validate input data
      const validated = UpdateProfileSchema.parse(input);
      
      // Get the Supabase client
      const supabase = await createClient()
      
      // Call the Edge Function
      const { data: profileData, error } = await supabase.functions.invoke('users/update-profile', {
        method: 'POST',
        body: validated
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function during profile update',
          requestId,
          error: error.message,
          status: error.status
        })
        
        return {
          success: false,
          error: error.message || 'Failed to update profile'
        }
      }
      
      logger.info({
        msg: 'Profile updated successfully via Edge Function',
        requestId,
        profileData
      })
      
      // Revalidate user profile page
      revalidatePath('/profile')
      
      return {
        success: true,
        data: { success: true }
      }
    } catch (error) {
      logger.error({
        msg: 'Error updating profile',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error'
      })
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }
    }
  })
})

// MARK: - Update family relationships
export const updateFamilyRelationships = withAuth(async (input: UpdateFamilyInput) => {
  const requestId = uuidv4()
  
  return await measureAsync('updateFamilyRelationships', async () => {
    try {
      logger.info({
        msg: 'Starting family relationships update via Edge Function',
        requestId,
        hasParents: !!input.parentIds?.length,
        hasChildren: !!input.childrenIds?.length,
        hasSpouses: !!input.spouseIds?.length,
      })
      
      // Validate input data
      const validated = updateFamilySchema.parse(input)
      
      // Get the Supabase client
      const supabase = await createClient()
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke('users/update-family-relationships', {
        method: 'POST',
        body: validated
      })
      
      if (error) {
        logger.error({
          msg: 'Error from Edge Function during family relationships update',
          requestId,
          error: error.message,
          status: error.status
        })
        
        return {
          success: false,
          error: error.message || 'Failed to update family relationships'
        }
      }
      
      logger.info({
        msg: 'Family relationships updated successfully via Edge Function',
        requestId
      })
      
      // Revalidate pages
      revalidatePath('/profile')
      revalidatePath('/family')
      
      return {
        success: true,
        data
      }
    } catch (error) {
      logger.error({
        msg: 'Error updating family relationships',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : 'Unknown error'
      })
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      }
    }
  })
})

// MARK: - Get family members
export const getFamilyMembers = withAuth(async () => {
  const requestId = uuidv4()
  
  return await measureAsync('getFamilyMembers', async () => {
    try {
      logger.info({
        msg: 'Fetching family members via Edge Function',
        requestId,
      })
      
      const supabase = await createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        logger.warn({
          msg: 'User not authenticated when fetching family members',
          requestId,
        })
        throw new Error('User not authenticated')
      }
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke(
        'family-relationships/get-family-members',
        {
          method: 'GET',
          headers: { 
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      )
      
      if (error || !data?.success) {
        logger.error({
          msg: 'Failed to call get-family-members edge function',
          requestId,
          error: error || data?.error,
        })
        throw new Error(data?.error || error?.message || 'Failed to get family members')
      }
      
      logger.info({
        msg: 'Family members fetched successfully via Edge Function',
        requestId,
        userId: session.user.id,
        memberCount: data.data?.length || 0,
      })
      
      return { success: true, members: data.data || [] }
    } catch (error) {
      logger.error({
        msg: 'Failed to get family members',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error),
      })
      return { error: 'Failed to get family members' }
    }
  })
})

// MARK: - Update data retention period
export const updateDataRetention = withAuth(async (period: 'forever' | 'year' | 'month' | 'week') => {
  const requestId = uuidv4()
  
  return await measureAsync('updateDataRetention', async () => {
    try {
      logger.info({
        msg: 'Updating data retention period via Edge Function',
        requestId,
        period,
      })
      
      const supabase = await createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        logger.warn({
          msg: 'User not authenticated when updating data retention',
          requestId,
        })
        throw new Error('User not authenticated')
      }
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke(
        'user-analytics/update-data-retention',
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${session.access_token}`,
          },
          body: { period },
        }
      )
      
      if (error || !data?.success) {
        logger.error({
          msg: 'Failed to call update-data-retention edge function',
          requestId,
          error: error || data?.error,
        })
        throw new Error(data?.error || error?.message || 'Failed to update data retention')
      }
      
      // Revalidate paths
      revalidatePath('/profile')
      revalidatePath(`/users/${session.user.id}`)
      revalidatePath('/settings')
      
      logger.info({
        msg: 'Data retention period updated successfully via Edge Function',
        requestId,
        userId: session.user.id,
        period,
      })
      
      return { success: true, profile: data.data }
    } catch (error) {
      logger.error({
        msg: 'Failed to update data retention period',
        requestId,
        period,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error),
      })
      return { error: 'Failed to update data retention' }
    }
  })
})

// MARK: - Upload profile picture
export const uploadProfilePicture = withAuth(async (file: File) => {
  const requestId = uuidv4()
  
  return await measureAsync('uploadProfilePicture', async () => {
    try {
      logger.info({
        msg: 'Starting profile picture upload',
        requestId,
        fileType: file.type,
        fileSize: file.size,
      })
      
      const supabase = await createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        logger.warn({
          msg: 'User not authenticated when uploading profile picture',
          requestId,
        })
        throw new Error('User not authenticated')
      }
      
      // Create form data for file upload
      const formData = new FormData()
      formData.append('file', file)
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke(
        'profile-media/upload-profile-picture',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      )
      
      if (error || !data?.success) {
        logger.error({
          msg: 'Failed to call upload-profile-picture edge function',
          requestId,
          error: error || data?.error,
        })
        throw new Error(data?.error || error?.message || 'Failed to upload profile picture')
      }
      
      // Revalidate paths
      revalidatePath('/profile')
      revalidatePath(`/users/${session.user.id}`)
      
      logger.info({
        msg: 'Profile picture uploaded successfully',
        requestId,
        userId: session.user.id,
      })
      
      return { success: true, profilePictureUrl: data.profilePictureUrl }
    } catch (error) {
      logger.error({
        msg: 'Failed to upload profile picture',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error),
        fileType: file.type,
        fileSize: file.size,
      })
      return { error: 'Failed to upload profile picture' }
    }
  })
})

// MARK: - Delete profile picture
export const deleteProfilePicture = withAuth(async () => {
  const requestId = uuidv4()
  
  return await measureAsync('deleteProfilePicture', async () => {
    try {
      logger.info({
        msg: 'Starting profile picture deletion',
        requestId,
      })
      
      const supabase = await createClient()
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        logger.warn({
          msg: 'User not authenticated when deleting profile picture',
          requestId,
        })
        throw new Error('User not authenticated')
      }
      
      // Call the Edge Function
      const { data, error } = await supabase.functions.invoke(
        'profile-media/delete-profile-picture',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          }
        }
      )
      
      if (error || !data?.success) {
        logger.error({
          msg: 'Failed to call delete-profile-picture edge function',
          requestId,
          error: error || data?.error,
        })
        throw new Error(data?.error || error?.message || 'Failed to delete profile picture')
      }
      
      // Revalidate paths
      revalidatePath('/profile')
      revalidatePath(`/users/${session.user.id}`)
      
      logger.info({
        msg: 'Profile picture deleted successfully',
        requestId,
        userId: session.user.id,
      })
      
      return { success: true }
    } catch (error) {
      logger.error({
        msg: 'Failed to delete profile picture',
        requestId,
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : String(error),
      })
      return { error: 'Failed to delete profile picture' }
    }
  })
}) 