export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          display_name: string
          email: string
          date_of_birth: string
          first_name: string
          last_name: string
          phone_number: string | null
          parent_ids: string[]
          children_ids: string[]
          spouse_ids: string[]
          is_admin: boolean
          can_add_members: boolean
          can_edit: boolean
          is_pending_signup: boolean
          created_at: string
          updated_at: string
          gender: string
          family_tree_id: string | null
          history_book_id: string | null
          email_verified: boolean
          data_retention_period: 'forever' | 'year' | 'month' | 'week'
          data_retention_last_updated: string | null
        }
        Insert: {
          id?: string
          display_name: string
          email: string
          date_of_birth: string
          first_name: string
          last_name: string
          phone_number?: string | null
          parent_ids?: string[]
          children_ids?: string[]
          spouse_ids?: string[]
          is_admin?: boolean
          can_add_members?: boolean
          can_edit?: boolean
          is_pending_signup?: boolean
          created_at?: string
          updated_at?: string
          gender: string
          family_tree_id?: string | null
          history_book_id?: string | null
          email_verified?: boolean
          data_retention_period?: 'forever' | 'year' | 'month' | 'week'
          data_retention_last_updated?: string | null
        }
        Update: {
          id?: string
          display_name?: string
          email?: string
          date_of_birth?: string
          first_name?: string
          last_name?: string
          phone_number?: string | null
          parent_ids?: string[]
          children_ids?: string[]
          spouse_ids?: string[]
          is_admin?: boolean
          can_add_members?: boolean
          can_edit?: boolean
          is_pending_signup?: boolean
          created_at?: string
          updated_at?: string
          gender?: string
          family_tree_id?: string | null
          history_book_id?: string | null
          email_verified?: boolean
          data_retention_period?: 'forever' | 'year' | 'month' | 'week'
          data_retention_last_updated?: string | null
        }
      }
      family_trees: {
        Row: {
          id: string
          name: string
          description: string | null
          created_by: string
          created_at: string
          updated_at: string
          members: string[]
          admins: string[]
          editors: string[]
          viewers: string[]
          privacy_level: 'private' | 'public' | 'shared'
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
          members?: string[]
          admins?: string[]
          editors?: string[]
          viewers?: string[]
          privacy_level?: 'private' | 'public' | 'shared'
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
          members?: string[]
          admins?: string[]
          editors?: string[]
          viewers?: string[]
          privacy_level?: 'private' | 'public' | 'shared'
        }
      }
      stories: {
        Row: {
          id: string
          title: string
          content: string
          author_id: string
          family_tree_id: string
          created_at: string
          updated_at: string
          media_urls: string[]
          tags: string[]
          likes: string[]
          privacy_level: 'family' | 'personal' | 'custom'
        }
        Insert: {
          id?: string
          title: string
          content: string
          author_id: string
          family_tree_id: string
          created_at?: string
          updated_at?: string
          media_urls?: string[]
          tags?: string[]
          likes?: string[]
          privacy_level?: 'family' | 'personal' | 'custom'
        }
        Update: {
          id?: string
          title?: string
          content?: string
          author_id?: string
          family_tree_id?: string
          created_at?: string
          updated_at?: string
          media_urls?: string[]
          tags?: string[]
          likes?: string[]
          privacy_level?: 'family' | 'personal' | 'custom'
        }
      }
      comments: {
        Row: {
          id: string
          content: string
          author_id: string
          story_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          content: string
          author_id: string
          story_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          content?: string
          author_id?: string
          story_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      invitations: {
        Row: {
          id: string
          invitee_id: string | null
          invitee_name: string
          invitee_email: string
          inviter_id: string
          inviter_name: string
          family_tree_id: string
          family_tree_name: string
          created_at: string
          expires_at: string
          status: 'pending' | 'accepted' | 'rejected'
          first_name: string
          last_name: string
          date_of_birth: string | null
          gender: string | null
          phone_number: string | null
          relationship: string | null
        }
        Insert: {
          id?: string
          invitee_id?: string | null
          invitee_name: string
          invitee_email: string
          inviter_id: string
          inviter_name: string
          family_tree_id: string
          family_tree_name: string
          created_at?: string
          expires_at: string
          status?: 'pending' | 'accepted' | 'rejected'
          first_name: string
          last_name: string
          date_of_birth?: string | null
          gender?: string | null
          phone_number?: string | null
          relationship?: string | null
        }
        Update: {
          id?: string
          invitee_id?: string | null
          invitee_name?: string
          invitee_email?: string
          inviter_id?: string
          inviter_name?: string
          family_tree_id?: string
          family_tree_name?: string
          created_at?: string
          expires_at?: string
          status?: 'pending' | 'accepted' | 'rejected'
          first_name?: string
          last_name?: string
          date_of_birth?: string | null
          gender?: string | null
          phone_number?: string | null
          relationship?: string | null
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      user_permissions: {
        Row: {
          id: string
          user_id: string
          permissions: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          permissions: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          permissions?: string[]
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      privacy_level: 'private' | 'public' | 'shared'
      data_retention_period: 'forever' | 'year' | 'month' | 'week'
      invitation_status: 'pending' | 'accepted' | 'rejected'
    }
  }
} 