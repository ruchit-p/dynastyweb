'use server'

import { z } from 'zod'
import { createServerSupabaseClient } from "@/lib/supabase/server"
import { withAuth } from "./auth"
import { revalidatePath } from 'next/cache'
import { UsersRepository } from '@/lib/repositories/users'

// Input validation schemas
const updateProfileSchema = z.object({
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
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>
export type UpdateFamilyInput = z.infer<typeof updateFamilySchema>

// Update user profile
export const updateProfile = withAuth(async (input: UpdateProfileInput) => {
  try {
    const validated = updateProfileSchema.parse(input)
    const supabase = createServerSupabaseClient()
    const repository = new UsersRepository(supabase)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    const profile = await repository.updateProfile(user.id, {
      firstName: validated.firstName,
      lastName: validated.lastName,
      fullName: validated.fullName,
      avatarUrl: validated.avatarUrl
    })

    // Update auth metadata
    await supabase.auth.updateUser({
      data: {
        first_name: validated.firstName,
        last_name: validated.lastName,
        full_name: validated.fullName || `${validated.firstName} ${validated.lastName}`,
        avatar_url: validated.avatarUrl
      }
    })

    // Revalidate paths
    revalidatePath('/profile')
    revalidatePath(`/users/${user.id}`)

    return { success: true, profile }
  } catch (error) {
    console.error('Update profile error:', error)
    return { error: 'Failed to update profile' }
  }
})

// Update family relationships
export const updateFamilyRelationships = withAuth(async (input: UpdateFamilyInput) => {
  try {
    const validated = updateFamilySchema.parse(input)
    const supabase = createServerSupabaseClient()
    const repository = new UsersRepository(supabase)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    const profile = await repository.updateFamilyRelationships(user.id, {
      parentIds: validated.parentIds,
      childrenIds: validated.childrenIds,
      spouseIds: validated.spouseIds
    })

    // Revalidate paths
    revalidatePath('/profile')
    revalidatePath(`/users/${user.id}`)
    revalidatePath('/family-tree')

    return { success: true, profile }
  } catch (error) {
    console.error('Update family relationships error:', error)
    return { error: 'Failed to update family relationships' }
  }
})

// Get family members
export const getFamilyMembers = withAuth(async () => {
  try {
    const supabase = createServerSupabaseClient()
    const repository = new UsersRepository(supabase)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    const members = await repository.getFamilyMembers(user.id)
    return { success: true, members }
  } catch (error) {
    console.error('Get family members error:', error)
    return { error: 'Failed to get family members' }
  }
})

// Update data retention period
export const updateDataRetention = withAuth(async (period: 'forever' | 'year' | 'month' | 'week') => {
  try {
    const supabase = createServerSupabaseClient()
    const repository = new UsersRepository(supabase)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    const profile = await repository.updateDataRetention(user.id, period)

    // Revalidate paths
    revalidatePath('/profile')
    revalidatePath(`/users/${user.id}`)
    revalidatePath('/settings')

    return { success: true, profile }
  } catch (error) {
    console.error('Update data retention error:', error)
    return { error: 'Failed to update data retention' }
  }
})

// Upload avatar
export const uploadAvatar = withAuth(async (file: File) => {
  try {
    const supabase = createServerSupabaseClient()
    const repository = new UsersRepository(supabase)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    const avatarUrl = await repository.uploadAvatar(user.id, file)

    // Revalidate paths
    revalidatePath('/profile')
    revalidatePath(`/users/${user.id}`)

    return { success: true, avatarUrl }
  } catch (error) {
    console.error('Upload avatar error:', error)
    return { error: 'Failed to upload avatar' }
  }
})

// Delete avatar
export const deleteAvatar = withAuth(async () => {
  try {
    const supabase = createServerSupabaseClient()
    const repository = new UsersRepository(supabase)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('User not found')

    await repository.deleteAvatar(user.id)

    // Revalidate paths
    revalidatePath('/profile')
    revalidatePath(`/users/${user.id}`)

    return { success: true }
  } catch (error) {
    console.error('Delete avatar error:', error)
    return { error: 'Failed to delete avatar' }
  }
}) 