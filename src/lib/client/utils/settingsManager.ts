import { loadUserSettings, saveUserSettings } from '@/app/actions/settings'
import type { UserSettings, NotificationSettings, PrivacySettings } from '@/app/actions/settings'

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

export type { UserSettings, NotificationSettings, PrivacySettings }

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

  async loadSettings(): Promise<UserSettings> {
    try {
      // Call the server action to load settings
      const { success, data, error } = await loadUserSettings()
      
      if (!success || !data) {
        console.error("Error loading settings:", error)
        return defaultSettings
      }
      
      return data
    } catch (error) {
      console.error("Error loading settings:", error)
      return defaultSettings
    }
  }

  async saveSettings(settings: UserSettings): Promise<void> {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout)
    }

    return new Promise((resolve, reject) => {
      this.debounceTimeout = setTimeout(async () => {
        try {
          // Call the server action to save settings
          const { success, error } = await saveUserSettings(settings)
          
          if (!success) {
            console.error("Error saving settings:", error)
            reject(error)
            return
          }
          
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