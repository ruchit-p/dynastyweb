import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/shared/types/supabase'

type Invitation = Database['public']['Tables']['invitations']['Row']
type InvitationInsert = Database['public']['Tables']['invitations']['Insert']
type InvitationUpdate = Database['public']['Tables']['invitations']['Update']

export class InvitationsRepository {
  constructor(private readonly supabase: SupabaseClient<Database>) {}

  async getById(id: string): Promise<Invitation | null> {
    const { data, error } = await this.supabase
      .from('invitations')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  }

  async getByToken(token: string, id: string): Promise<Invitation | null> {
    const { data, error } = await this.supabase
      .from('invitations')
      .select('*')
      .eq('id', id)
      .eq('token', token)
      .single()

    if (error) throw error
    return data
  }

  async create(invitation: InvitationInsert): Promise<Invitation> {
    const { data, error } = await this.supabase
      .from('invitations')
      .insert(invitation)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async update(id: string, update: InvitationUpdate): Promise<Invitation> {
    const { data, error } = await this.supabase
      .from('invitations')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('invitations')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
} 