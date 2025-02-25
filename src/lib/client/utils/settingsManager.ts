import { supabaseBrowser } from '@/lib/client/supabase-browser'

export interface UserSettings {
  notifications: NotificationSettings
  privacy: PrivacySettings
}

export interface NotificationSettings {
  pushEnabled: boolean
  emailEnabled: boolean
  newMessageEnabled: boolean
  friendRequestsEnabled: boolean
  eventRemindersEnabled: boolean
}

export interface PrivacySettings {
  locationEnabled: boolean
  dataRetention: "30days" | "90days" | "1year" | "forever"
}

const defaultSettings: UserSettings = {
  notifications: {
    pushEnabled: true,
    emailEnabled: true,
    newMessageEnabled: true,
    friendRequestsEnabled: true,
    eventRemindersEnabled: false,
  },
  privacy: {
    locationEnabled: true,
    dataRetention: "1year",
  },
}

export class SettingsManager {
  private static instance: SettingsManager
  private debounceTimeout: NodeJS.Timeout | null = null
  private readonly debounceInterval = 500 // 500ms

  private constructor() {}

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager()
    }
    return SettingsManager.instance
  }

  async loadSettings(userId: string): Promise<UserSettings> {
    try {
      const { data: settings, error } = await supabaseBrowser
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error) {
        if (error.code === 'PGRST116') { // Record not found
          // If no settings exist, create default settings
          await this.saveSettings(userId, defaultSettings)
          return defaultSettings
        }
        throw error
      }

      return {
        notifications: {
          pushEnabled: settings.push_enabled,
          emailEnabled: settings.email_enabled,
          newMessageEnabled: settings.new_message_enabled,
          friendRequestsEnabled: settings.friend_requests_enabled,
          eventRemindersEnabled: settings.event_reminders_enabled,
        },
        privacy: {
          locationEnabled: settings.location_enabled,
          dataRetention: settings.data_retention,
        },
      }
    } catch (error) {
      console.error("Error loading settings:", error)
      return defaultSettings
    }
  }

  async saveSettings(userId: string, settings: UserSettings): Promise<void> {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    return new Promise((resolve, reject) => {
      this.debounceTimeout = setTimeout(async () => {
        try {
          const { error } = await supabaseBrowser
            .from('user_settings')
            .upsert({
              user_id: userId,
              push_enabled: settings.notifications.pushEnabled,
              email_enabled: settings.notifications.emailEnabled,
              new_message_enabled: settings.notifications.newMessageEnabled,
              friend_requests_enabled: settings.notifications.friendRequestsEnabled,
              event_reminders_enabled: settings.notifications.eventRemindersEnabled,
              location_enabled: settings.privacy.locationEnabled,
              data_retention: settings.privacy.dataRetention,
              updated_at: new Date().toISOString(),
            })

          if (error) throw error
          resolve()
        } catch (error) {
          console.error("Error saving settings:", error)
          reject(error)
        }
      }, this.debounceInterval)
    })
  }

  getDefaultSettings(): UserSettings {
    return { ...defaultSettings }
  }
} 