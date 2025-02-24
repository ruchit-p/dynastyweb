"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Fingerprint, Key, Trash, Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import ProtectedRoute from "@/components/ProtectedRoute"
import { ChangePasswordDialog } from "@/components/ChangePasswordDialog"
import { SettingsManager, type PrivacySettings } from "@/utils/settingsManager"

export default function PrivacySecurityPage() {
  const router = useRouter()
  const { user, profile, signOut } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<PrivacySettings>({
    locationEnabled: true,
    dataRetention: "1year",
  })
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      if (!user?.id) return

      try {
        const settingsManager = SettingsManager.getInstance()
        const userSettings = await settingsManager.loadSettings(user.id)
        setSettings(userSettings.privacy)
      } catch (error) {
        console.error("Error loading privacy settings:", error)
        toast({
          title: "Error",
          description: "Failed to load privacy settings. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    void loadSettings()
  }, [user?.id, toast])

  const handleToggle = (key: keyof PrivacySettings) => {
    if (key === "locationEnabled") {
      setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
    }
  }

  const handleDataRetentionChange = (value: PrivacySettings["dataRetention"]) => {
    setSettings((prev) => ({ ...prev, dataRetention: value }))
  }

  const handleSave = async () => {
    if (!user?.id) return

    try {
      setIsSaving(true)
      const settingsManager = SettingsManager.getInstance()
      await settingsManager.saveSettings(user.id, {
        notifications: (await settingsManager.loadSettings(user.id)).notifications,
        privacy: settings,
      })

      toast({
        title: "Success",
        description: "Your privacy settings have been updated.",
      })
    } catch (error) {
      console.error("Error saving privacy settings:", error)
      toast({
        title: "Error",
        description: "Failed to save privacy settings. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user || !profile) return

    try {
      setIsDeleting(true)
      const supabase = createClient()

      // Delete user's profile
      const { error: profileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)

      if (profileError) throw profileError

      // Delete user's auth account
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id)
      if (authError) throw authError

      // Log out the user
      await signOut()

      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      })

      // Redirect to home page
      router.push("/")
    } catch (error) {
      console.error("Error deleting account:", error)
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      })
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="flex justify-center items-center min-h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A5C36]" />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="bg-white shadow-xl rounded-xl overflow-hidden p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Fingerprint className="h-5 w-5 text-[#0A5C36]" />
              <Label htmlFor="location-services" className="text-lg font-semibold">
                Location Services
              </Label>
            </div>
            <Switch
              id="location-services"
              checked={settings.locationEnabled}
              onCheckedChange={() => handleToggle("locationEnabled")}
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h2 className="text-xl font-semibold mb-4">Data Retention</h2>
            <Select onValueChange={handleDataRetentionChange} value={settings.dataRetention}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select data retention period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30days">30 days</SelectItem>
                <SelectItem value="90days">90 days</SelectItem>
                <SelectItem value="1year">1 year</SelectItem>
                <SelectItem value="forever">Forever</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h2 className="text-xl font-semibold mb-4">Password</h2>
            <Button variant="outline" onClick={() => setShowChangePasswordDialog(true)}>
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Danger Zone</h2>
            <Button variant="destructive" onClick={() => setShowDeleteDialog(true)}>
              <Trash className="h-4 w-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove your data from our
              servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label htmlFor="delete-confirmation" className="text-sm font-medium">
              Type &quot;DELETE&quot; to confirm
            </Label>
            <Input
              id="delete-confirmation"
              value={deleteConfirmation}
              onChange={(e) => setDeleteConfirmation(e.target.value)}
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteConfirmation !== "DELETE" || isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                "Delete Account"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ChangePasswordDialog
        open={showChangePasswordDialog}
        onOpenChange={setShowChangePasswordDialog}
      />
    </ProtectedRoute>
  )
} 