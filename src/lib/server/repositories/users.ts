import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/lib/shared/types/supabase'
import { BaseRepository } from './base'
import { uploadFile } from '@/app/actions/storage'
import { sanitizeFileName } from '@/lib/shared/validation/storage'

type UserRow = Database['public']['Tables']['users']['Row']
type UserInsert = Database['public']['Tables']['users']['Insert']
type UserUpdate = Partial<UserRow>

export class UsersRepository extends BaseRepository<'users'> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'users')
  }

  // MARK: - User Operations

  async create(data: UserInsert): Promise<UserRow> {
    const { data: user, error } = await this.query
      .insert(data)
      .select()
      .single()

    if (error) throw error
    return user
  }

  async update(id: string, data: UserUpdate): Promise<UserRow> {
    const { data: user, error } = await this.query
      .update(data)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return user
  }

  async getByEmail(email: string): Promise<UserRow | null> {
    const { data, error } = await this.query
      .select()
      .eq('email', email)
      .single()

    if (error) throw error
    return data
  }

  async updateProfile(userId: string, data: {
    firstName: string
    lastName: string
    fullName?: string
    avatarUrl?: string
  }): Promise<UserRow> {
    const { data: updated, error } = await this.update(userId, {
      first_name: data.firstName,
      last_name: data.lastName,
      display_name: data.fullName || `${data.firstName} ${data.lastName}`,
      avatar_url: data.avatarUrl,
      updated_at: new Date().toISOString()
    })

    if (error) throw error
    return updated
  }

  async updateFamilyRelationships(userId: string, relationships: {
    parentIds?: string[]
    childrenIds?: string[]
    spouseIds?: string[]
  }): Promise<UserRow> {
    const { data: user } = await this.getById(userId)
    if (!user) throw new Error('User not found')

    const { data: updated, error } = await this.update(userId, {
      parent_ids: relationships.parentIds || user.parent_ids,
      children_ids: relationships.childrenIds || user.children_ids,
      spouse_ids: relationships.spouseIds || user.spouse_ids,
      updated_at: new Date().toISOString()
    })

    if (error) throw error
    return updated
  }

  async getFamilyMembers(userId: string): Promise<UserRow[]> {
    const { data: user } = await this.getById(userId)
    if (!user) throw new Error('User not found')

    const allMemberIds = [
      ...user.parent_ids,
      ...user.children_ids,
      ...user.spouse_ids
    ]

    if (allMemberIds.length === 0) return []

    const { data, error } = await this.query
      .select()
      .in('id', allMemberIds)

    if (error) throw error
    return data
  }

  async updateDataRetention(userId: string, period: 'forever' | 'year' | 'month' | 'week'): Promise<UserRow> {
    const { data: updated, error } = await this.update(userId, {
      data_retention_period: period,
      updated_at: new Date().toISOString()
    })

    if (error) throw error
    return updated
  }

  // MARK: - Role & Permission Management

  async addRole(userId: string, role: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role
      })

    if (error) throw error
    return true
  }

  async removeRole(userId: string, role: string): Promise<boolean> {
    const { error } = await this.supabase
      .from('user_roles')
      .delete()
      .eq('user_id', userId)
      .eq('role', role)

    if (error) throw error
    return true
  }

  async getRoles(userId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)

    if (error) throw error
    return data.map(r => r.role)
  }

  async updatePermissions(userId: string, permissions: string[]): Promise<boolean> {
    const { error } = await this.supabase
      .from('user_permissions')
      .upsert({
        user_id: userId,
        permissions,
        updated_at: new Date().toISOString()
      })

    if (error) throw error
    return true
  }

  async getPermissions(userId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('user_permissions')
      .select('permissions')
      .eq('user_id', userId)
      .single()

    if (error) return []
    return data?.permissions || []
  }

  // MARK: - Avatar Management

  /**
   * Uploads a user's avatar and updates their profile
   */
  async uploadAvatar(userId: string, file: File): Promise<string> {
    const fileExt = file.name.split('.').pop()
    const sanitizedName = sanitizeFileName(file.name)
    const fileName = `${userId}-${sanitizedName}`
    const filePath = `avatars/${fileName}`

    const { url, error } = await uploadFile(file, 'avatars', {
      path: filePath,
      contentType: file.type
    })

    if (error) {
      throw new Error(error)
    }

    // Update user profile with new avatar URL
    await this.update(userId, {
      avatar_url: url,
      updated_at: new Date().toISOString()
    })

    return url
  }

  async deleteAvatar(userId: string): Promise<boolean> {
    const { data: user } = await this.getById(userId)
    if (!user?.avatar_url) return true

    const fileName = user.avatar_url.split('/').pop()
    if (!fileName) return true

    const { error } = await this.supabase
      .storage
      .from('media')
      .remove([`avatars/${fileName}`])

    if (error) throw error

    // Remove avatar URL from user profile
    await this.update(userId, {
      avatar_url: undefined,
      updated_at: new Date().toISOString()
    })

    return true
  }
} 