"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Bell, Mail, MessageSquare, UserPlus, Calendar, Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import ProtectedRoute from "@/components/ProtectedRoute"

interface NotificationSettings {
  pushEnabled: boolean
  emailEnabled: boolean
  newMessageEnabled: boolean
  mentionsEnabled: boolean
  friendRequestsEnabled: boolean
  eventRemindersEnabled: boolean
  notificationSound: string
}

const defaultSettings: NotificationSettings = {
  pushEnabled: true,
  emailEnabled: true,
  newMessageEnabled: true,
  mentionsEnabled: true,
  friendRequestsEnabled: true,
  eventRemindersEnabled: false,
  notificationSound: "default",
}

export default function NotificationsPage() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      if (!user?.uid) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          if (data.notificationSettings) {
            setSettings(data.notificationSettings)
          }
        }
      } catch (error) {
        console.error("Error fetching notification settings:", error)
        toast({
          title: "Error",
          description: "Failed to load notification settings. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    void fetchNotificationSettings()
  }, [user?.uid, toast])

  const handleToggle = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleSoundChange = (value: string) => {
    setSettings((prev) => ({ ...prev, notificationSound: value }))
  }

  const handleSave = async () => {
    if (!user?.uid) return

    try {
      setIsSaving(true)
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        notificationSettings: settings,
        updatedAt: serverTimestamp(),
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
      <ProtectedRoute>
        <div className="container mx-auto p-4 max-w-3xl flex justify-center items-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A5C36]" />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4 max-w-3xl">
        <h1 className="text-3xl font-bold my-6 text-[#000000]">Notification Settings</h1>

        <div className="bg-white shadow-xl rounded-xl overflow-hidden p-6">
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

            <div className="border-t border-gray-200 pt-4">
              <h2 className="text-xl font-semibold mb-4">Notification Sound</h2>
              <Select onValueChange={handleSoundChange} value={settings.notificationSound}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a sound" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="chime">Chime</SelectItem>
                  <SelectItem value="bell">Bell</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
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
    </ProtectedRoute>
  )
} 