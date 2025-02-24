"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera, Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import { createClient } from "@/lib/supabase/client"
import ProtectedRoute from "@/components/ProtectedRoute"

export default function PersonalInformationPage() {
  const { user, profile, refreshProfile } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newProfilePicture, setNewProfilePicture] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
  })

  useEffect(() => {
    if (profile) {
      setFormData({
        firstName: profile.first_name,
        lastName: profile.last_name,
        phoneNumber: profile.phone_number || "",
      })
    }
  }, [profile])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewProfilePicture(e.target.files[0])
    }
  }

  const handleSave = async () => {
    if (!user?.id) return

    try {
      setIsSaving(true)
      const supabase = createClient()

      let profilePictureUrl = profile?.avatar_url

      // Upload new profile picture if one was selected
      if (newProfilePicture) {
        const fileExt = newProfilePicture.name.split('.').pop()
        const filePath = `${user.id}-${Math.random()}.${fileExt}`

        const { error: uploadError, data } = await supabase.storage
          .from('avatars')
          .upload(filePath, newProfilePicture)

        if (uploadError) {
          throw uploadError
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath)

        profilePictureUrl = publicUrl
      }

      // Update profile in database
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: formData.firstName,
          last_name: formData.lastName,
          phone_number: formData.phoneNumber,
          display_name: `${formData.firstName} ${formData.lastName}`.trim(),
          avatar_url: profilePictureUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) {
        throw updateError
      }

      // Refresh profile data
      await refreshProfile()

      toast({
        title: "Success",
        description: "Your profile has been updated successfully.",
      })

      setIsEditing(false)
      setNewProfilePicture(null)
    } catch (error) {
      console.error("Error updating profile:", error)
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (!profile) {
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
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <Image
              src={newProfilePicture ? URL.createObjectURL(newProfilePicture) : (profile.avatar_url || "/avatar.svg")}
              alt="Profile picture"
              width={200}
              height={200}
              className="rounded-full object-cover"
            />
            {isEditing && (
              <label
                htmlFor="profile-picture"
                className="absolute bottom-0 right-0 bg-[#0A5C36] text-white p-2 rounded-full cursor-pointer hover:bg-[#0A5C36]/90 transition-colors"
              >
                <Camera className="h-5 w-5" />
                <input
                  id="profile-picture"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleProfilePictureChange}
                />
              </label>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                disabled={!isEditing}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={user?.email}
              disabled={true} // Email cannot be changed
              className="bg-gray-50"
            />
          </div>
          <div>
            <Label htmlFor="phoneNumber">Phone Number</Label>
            <Input
              id="phoneNumber"
              name="phoneNumber"
              value={formData.phoneNumber}
              onChange={handleInputChange}
              disabled={!isEditing}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </>
          ) : (
            <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
} 