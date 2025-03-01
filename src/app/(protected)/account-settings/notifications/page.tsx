"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Bell, Mail, MessageSquare, UserPlus, Calendar, Loader2 } from "lucide-react"
import { useAuth, AuthGuard } from "@/components/auth"
import { useToast } from "@/components/ui/use-toast"
import { SettingsManager, type NotificationSettings } from "@/lib/client/utils/settingsManager"

export default function NotificationsPage() {
  const { currentUser } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<NotificationSettings>({
    pushEnabled: true,
    emailEnabled: true,
    newMessageEnabled: true,
    friendRequestsEnabled: true,
    eventRemindersEnabled: false,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      if (!currentUser?.id) return

      try {
        const settingsManager = SettingsManager.getInstance()
        const userSettings = await settingsManager.loadSettings(currentUser.id)
        setSettings(userSettings.notifications)
      } catch (error) {
        console.error("Error loading notification settings:", error)
        toast({
          title: "Error",
          description: "Failed to load notification settings. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    void loadSettings()
  }, [currentUser?.id, toast])

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings((prev: NotificationSettings) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSave = async () => {
    if (!currentUser?.id) return

    try {
      setIsSaving(true)
      const settingsManager = SettingsManager.getInstance()
      await settingsManager.saveSettings(currentUser.id, {
        notifications: settings,
        privacy: (await settingsManager.loadSettings(currentUser.id)).privacy,
      })

      toast({
        title: "Success",
        description: "Your notification settings have been updated.",
      })
    } catch (error) {
      console.error("Error saving notification settings:", error)
      toast({
        title: "Error",
        description: "Failed to save notification settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <div className="flex justify-center items-center min-h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A5C36]" />
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="space-y-6">
        <div className="bg-white shadow-md rounded-lg p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Bell className="h-5 w-5 text-[#0A5C36]" />
                <Label htmlFor="push-notifications" className="text-lg font-semibold">
                  Push Notifications
                </Label>
              </div>
              <Switch
                id="push-notifications"
                checked={settings.pushEnabled}
                onCheckedChange={() => handleToggle("pushEnabled")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-[#0A5C36]" />
                <Label htmlFor="email-notifications" className="text-lg font-semibold">
                  Email Notifications
                </Label>
              </div>
              <Switch
                id="email-notifications"
                checked={settings.emailEnabled}
                onCheckedChange={() => handleToggle("emailEnabled")}
              />
            </div>

            <div className="border-t border-gray-200 pt-4">
              <h2 className="text-xl font-semibold mb-4">Notification Types</h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-5 w-5 text-[#0A5C36]" />
                    <Label htmlFor="new-messages" className="font-medium">
                      New Messages
                    </Label>
                  </div>
                  <Switch
                    id="new-messages"
                    checked={settings.newMessageEnabled}
                    onCheckedChange={() => handleToggle("newMessageEnabled")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <UserPlus className="h-5 w-5 text-[#0A5C36]" />
                    <Label htmlFor="friend-requests" className="font-medium">
                      Friend Requests
                    </Label>
                  </div>
                  <Switch
                    id="friend-requests"
                    checked={settings.friendRequestsEnabled}
                    onCheckedChange={() => handleToggle("friendRequestsEnabled")}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-[#0A5C36]" />
                    <Label htmlFor="event-reminders" className="font-medium">
                      Event Reminders
                    </Label>
                  </div>
                  <Switch
                    id="event-reminders"
                    checked={settings.eventRemindersEnabled}
                    onCheckedChange={() => handleToggle("eventRemindersEnabled")}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </AuthGuard>
  )
} 