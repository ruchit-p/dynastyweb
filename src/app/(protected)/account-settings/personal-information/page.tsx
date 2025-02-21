"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Camera, Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import ProtectedRoute from "@/components/ProtectedRoute"

interface UserData {
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  profilePicture?: string
  displayName: string
}

export default function PersonalInformationPage() {
  const router = useRouter()
  const { user, updateUserProfile } = useAuth()
  const { toast } = useToast()
  const [userData, setUserData] = useState<UserData>({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    displayName: "",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newProfilePicture, setNewProfilePicture] = useState<File | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.uid) return

      try {
        const userDoc = await getDoc(doc(db, "users", user.uid))
        if (userDoc.exists()) {
          const data = userDoc.data()
          setUserData({
            firstName: data.firstName || "",
            lastName: data.lastName || "",
            email: data.email || "",
            phoneNumber: data.phoneNumber || "",
            profilePicture: data.profilePicture,
            displayName: data.displayName || "",
          })
        }
      } catch (error) {
        console.error("Error fetching user data:", error)
        toast({
          title: "Error",
          description: "Failed to load user information. Please try again.",
          variant: "destructive",
        })
      }
    }

    void fetchUserData()
  }, [user?.uid, toast])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setUserData((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewProfilePicture(e.target.files[0])
    }
  }

  const handleSave = async () => {
    if (!user?.uid) return

    try {
      setIsSaving(true)

      let profilePictureUrl = userData.profilePicture

      // Upload new profile picture if one was selected
      if (newProfilePicture) {
        const storageRef = ref(storage, `profile-pictures/${user.uid}`)
        await uploadBytes(storageRef, newProfilePicture)
        profilePictureUrl = await getDownloadURL(storageRef)
      }

      // Update Firestore document
      const userRef = doc(db, "users", user.uid)
      await updateDoc(userRef, {
        firstName: userData.firstName,
        lastName: userData.lastName,
        phoneNumber: userData.phoneNumber,
        displayName: `${userData.firstName} ${userData.lastName}`.trim(),
        profilePicture: profilePictureUrl,
        updatedAt: serverTimestamp(),
      })

      // Update Firebase Auth profile
      await updateUserProfile(`${userData.firstName} ${userData.lastName}`.trim())

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

  return (
    <ProtectedRoute>
      <div className="container mx-auto p-4 max-w-3xl">
        <h1 className="text-3xl font-bold my-6 text-[#000000]">Personal Information</h1>

        <div className="bg-white shadow-xl rounded-xl overflow-hidden p-6">
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <Image
                src={newProfilePicture ? URL.createObjectURL(newProfilePicture) : (userData.profilePicture || "/avatar.svg")}
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
                  value={userData.firstName}
                  onChange={handleInputChange}
                  disabled={!isEditing}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  value={userData.lastName}
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
                value={userData.email}
                disabled={true} // Email cannot be changed
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="phoneNumber">Phone Number</Label>
              <Input
                id="phoneNumber"
                name="phoneNumber"
                value={userData.phoneNumber}
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
      </div>
    </ProtectedRoute>
  )
} 