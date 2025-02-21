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
import { Eye, Shield, Fingerprint, Key, Trash, Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth"
import ProtectedRoute from "@/components/ProtectedRoute"

interface PrivacySettings {
  privacyEnabled: boolean
  twoFactorEnabled: boolean
  locationEnabled: boolean
  dataRetention: string
  lastPasswordChange: string
}

const defaultSettings: PrivacySettings = {
  privacyEnabled: true,
  twoFactorEnabled: false,
  locationEnabled: true,
  dataRetention: "1year",
  lastPasswordChange: new Date().toISOString().split('T')[0],
}

export default function PrivacySecurityPage() {
  const router = useRouter()
  const { user, logout } = useAuth()
  const { toast } = useToast()
  const [settings, setSettings] = useState<PrivacySettings>(defaultSettings)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchPrivacySettings = async () => {
      if (!user?.uid) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          if (data.privacySettings) {
            setSettings(data.privacySettings)
          }
        }
      } catch (error) {
        console.error("Error fetching privacy settings:", error)
        toast({
          title: "Error",
          description: "Failed to load privacy settings. Please try again.",
          variant: "destructive",
        })
      } finally {
        setIsLoading(false)
      }
    }

    void fetchPrivacySettings()
  }, [user?.uid, toast])

  const handleToggle = (key: keyof PrivacySettings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const handleDataRetentionChange = (value: string) => {
    setSettings((prev) => ({ ...prev, dataRetention: value }))
  }

  const handleSave = async () => {
    if (!user?.uid) return

    try {
      setIsSaving(true)
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        privacySettings: {
          ...settings,
          updatedAt: serverTimestamp(),
        },
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
    if (!user || !auth.currentUser) return

    try {
      setIsDeleting(true)

      // Delete user document from Firestore
      await deleteDoc(doc(db, "users", user.uid))

      // Delete user from Firebase Auth
      await deleteUser(auth.currentUser)

      // Log out the user
      await logout()

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
        <div className="container mx-auto p-4 max-w-3xl flex justify-center items-center min-h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A5C36]" />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4 max-w-3xl">
        <h1 className="text-3xl font-bold my-6 text-[#000000]">Privacy & Security</h1>

        <div className="bg-white shadow-xl rounded-xl overflow-hidden p-6">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Eye className="h-5 w-5 text-[#0A5C36]" />
                <Label htmlFor="privacy-mode" className="text-lg font-semibold">
                  Privacy Mode
                </Label>
              </div>
              <Switch
                id="privacy-mode"
                checked={settings.privacyEnabled}
                onCheckedChange={() => handleToggle("privacyEnabled")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-[#0A5C36]" />
                <Label htmlFor="two-factor" className="text-lg font-semibold">
                  Two-Factor Authentication
                </Label>
              </div>
              <Switch
                id="two-factor"
                checked={settings.twoFactorEnabled}
                onCheckedChange={() => handleToggle("twoFactorEnabled")}
              />
            </div>

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
              <p className="text-sm text-gray-600 mb-2">Last changed: {settings.lastPasswordChange}</p>
              <Button variant="outline" onClick={() => router.push("/account-settings/change-password")}>
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
                Type "DELETE" to confirm
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
      </div>
    </ProtectedRoute>
  )
} 