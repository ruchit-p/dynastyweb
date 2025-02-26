'use server'

import { z } from 'zod'
import { createClient } from '@/lib/server/supabase'
import { withAuth } from '@/lib/server/middleware'
import { revalidatePath } from 'next/cache'
import logger from '@/lib/logger'
import type { ServerActionResult } from '@/lib/shared/types/actions'
import { v4 as uuidv4 } from 'uuid'

// MARK: - Types

export interface NotificationSettings {
  pushEnabled: boolean
  emailEnabled: boolean
  newMessageEnabled: boolean
  friendRequestsEnabled: boolean
  eventRemindersEnabled: boolean
}

export interface PrivacySettings {
  locationEnabled: boolean
  dataRetention: 'forever' | '1year' | '90days' | '30days'
}

export interface UserSettings {
  notifications: NotificationSettings
  privacy: PrivacySettings
}

// MARK: - Validation Schemas

const NotificationSettingsSchema = z.object({
  pushEnabled: z.boolean(),
  emailEnabled: z.boolean(),
  newMessageEnabled: z.boolean(),
  friendRequestsEnabled: z.boolean(),
  eventRemindersEnabled: z.boolean(),
})

const PrivacySettingsSchema = z.object({
  locationEnabled: z.boolean(),
  dataRetention: z.enum(['forever', '1year', '90days', '30days']),
})

const UserSettingsSchema = z.object({
  notifications: NotificationSettingsSchema,
  privacy: PrivacySettingsSchema,
})

// MARK: - Actions

/**
 * Loads user settings from the Edge Function
 */
export const loadUserSettings = withAuth(async (): Promise<ServerActionResult<UserSettings>> => {
  const requestId = uuidv4()

  try {
    logger.info({
      msg: 'Loading user settings',
      requestId,
    })

    // Get the Supabase client
    const supabase = await createClient()

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('users/get-settings', {
      method: 'POST',
      body: {}
    })

    if (error) {
      logger.error({
        msg: 'Error loading user settings from Edge Function',
        requestId,
        error: error.message,
        status: error.status
      })

      return {
        success: false,
        error: error.message || 'Failed to load settings'
      }
    }

    if (!data.success || !data.settings) {
      logger.error({
        msg: 'Invalid response from Edge Function',
        requestId,
        response: data
      })

      return {
        success: false,
        error: 'Invalid response from server'
      }
    }

    logger.info({
      msg: 'Settings loaded successfully',
      requestId
    })

    return {
      success: true,
      data: data.settings as UserSettings
    }
  } catch (error) {
    logger.error({
      msg: 'Error loading user settings',
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

/**
 * Saves user settings via the Edge Function
 */
export const saveUserSettings = withAuth(async (settings: UserSettings): Promise<ServerActionResult<{ success: boolean }>> => {
  const requestId = uuidv4()

  try {
    logger.info({
      msg: 'Saving user settings',
      requestId,
    })

    // Validate the settings
    const validatedSettings = UserSettingsSchema.parse(settings)

    // Get the Supabase client
    const supabase = await createClient()

    // Call the Edge Function
    const { data, error } = await supabase.functions.invoke('users/update-settings', {
      method: 'POST',
      body: validatedSettings
    })

    if (error) {
      logger.error({
        msg: 'Error saving user settings via Edge Function',
        requestId,
        error: error.message,
        status: error.status
      })

      return {
        success: false,
        error: error.message || 'Failed to save settings'
      }
    }

    if (!data.success) {
      logger.error({
        msg: 'Invalid response from Edge Function',
        requestId,
        response: data
      })

      return {
        success: false,
        error: 'Invalid response from server'
      }
    }

    logger.info({
      msg: 'Settings saved successfully',
      requestId
    })

    // Revalidate the path to ensure fresh data
    revalidatePath('/account-settings/notifications')
    revalidatePath('/account-settings/privacy')

    return {
      success: true,
      data: { success: true }
    }
  } catch (error) {
    logger.error({
      msg: 'Error saving user settings',
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