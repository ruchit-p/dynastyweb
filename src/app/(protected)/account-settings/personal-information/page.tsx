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
import { doc, updateDoc, serverTimestamp, FieldValue, Timestamp } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import ProtectedRoute from "@/components/ProtectedRoute"
import { EnhancedCalendar } from "@/components/ui/enhanced-calendar"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { format } from "date-fns"
import { firebaseImageLoader } from "@/lib/image-loader"

export default function PersonalInformationPage() {
  const { currentUser, firestoreUser, refreshFirestoreUser } = useAuth()
  const { toast } = useToast()
  
  // Add debug logging
  console.log('Auth state:', { currentUser, firestoreUser, loading: !firestoreUser })
  
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newProfilePicture, setNewProfilePicture] = useState<File | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [showCalendar, setShowCalendar] = useState(false)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    gender: "",
  })

  // Eager data fetching to keep data up to date
  useEffect(() => {
    // Prefetch user data when component mounts
    refreshFirestoreUser();
    
    // Set up an interval to refresh data in the background to keep it fresh
    const intervalId = setInterval(() => {
      // Only refresh if user is not editing to avoid disrupting their work
      if (!isEditing) {
        refreshFirestoreUser();
      }
    }, 60000); // Refresh every minute
    
    return () => clearInterval(intervalId);
  }, [refreshFirestoreUser, isEditing]);

  useEffect(() => {
    if (firestoreUser) {
      setFormData({
        firstName: firestoreUser.firstName,
        lastName: firestoreUser.lastName,
        phoneNumber: firestoreUser.phoneNumber || "",
        gender: firestoreUser.gender || "",
      })
      
      // Set the date of birth if it exists
      if (firestoreUser.dateOfBirth) {
        // Handle if it's a Firestore Timestamp
        if (firestoreUser.dateOfBirth instanceof Timestamp) {
          setSelectedDate(firestoreUser.dateOfBirth.toDate())
        } 
        // Handle if it's already a Date
        else if (firestoreUser.dateOfBirth instanceof Date) {
          setSelectedDate(firestoreUser.dateOfBirth)
        } 
        // Try to parse it as a string just in case
        else if (typeof firestoreUser.dateOfBirth === 'string') {
          try {
            setSelectedDate(new Date(firestoreUser.dateOfBirth))
          } catch (error) {
            console.error("Error parsing date:", error)
          }
        }
      }
    }
  }, [firestoreUser])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewProfilePicture(e.target.files[0])
    }
  }

  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date)
  }

  const handleGenderChange = (value: string) => {
    setFormData((prev) => ({ ...prev, gender: value }))
  }

  const handleSave = async () => {
    if (!currentUser?.uid) return

    try {
      setIsSaving(true)

      let profilePictureUrl = firestoreUser?.profilePicture

      // Upload new profile picture if one was selected
      if (newProfilePicture) {
        const storageRef = ref(storage, `profilePictures/${currentUser.uid}/${newProfilePicture.name}`)
        await uploadBytes(storageRef, newProfilePicture)
        profilePictureUrl = await getDownloadURL(storageRef)
      }

      // Prepare update data
      const updateData: Partial<{
        firstName: string;
        lastName: string;
        phoneNumber: string | null;
        gender: string | null;
        dateOfBirth: Date | null;
        displayName: string;
        updatedAt: FieldValue;
        profilePicture?: string;
      }> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        gender: formData.gender || null,
        dateOfBirth: selectedDate || null,
        displayName: `${formData.firstName} ${formData.lastName}`.trim(),
        updatedAt: serverTimestamp(),
      }

      // Only include profilePicture if it's not undefined
      if (profilePictureUrl !== undefined) {
        updateData.profilePicture = profilePictureUrl;
      }

      // Update Firestore document
      const userRef = doc(db, "users", currentUser.uid)
      await updateDoc(userRef, updateData)

      // Refresh Firestore user data
      await refreshFirestoreUser()

      toast({
        title: "Success",
        description: "Your profile has been updated successfully.",
      })

      setIsEditing(false)
      setNewProfilePicture(null)
      setShowCalendar(false)
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

  if (!firestoreUser) {
    return (
      <ProtectedRoute>
        <div className="flex flex-col justify-center items-center min-h-[500px]">
          <Loader2 className="h-8 w-8 animate-spin text-[#0A5C36] mb-4" />
          <p className="text-gray-500">Loading your profile...</p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => {
              refreshFirestoreUser();
              toast({
                title: "Refreshing data",
                description: "Attempting to reload your profile information."
              });
            }}
          >
            Retry Loading
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="bg-white shadow-xl rounded-xl overflow-hidden p-6 animate-in fade-in duration-300">
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            {newProfilePicture ? (
              // For preview of new uploads, use unoptimized Image with blob URL
              <Image
                src={URL.createObjectURL(newProfilePicture)}
                alt="Profile picture preview"
                width={200}
                height={200}
                className="rounded-full object-cover"
                unoptimized={true}
              />
            ) : (
              // For stored images or default avatar
              <Image
                src={firestoreUser.profilePicture || "/avatar.svg"}
                alt="Profile picture"
                width={200}
                height={200}
                className="rounded-full object-cover"
                loader={firestoreUser.profilePicture ? firebaseImageLoader : undefined}
                unoptimized={!!firestoreUser.profilePicture}
              />
            )}
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
              value={firestoreUser.email}
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
          <div>
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            <div className="relative">
              <Input
                id="dateOfBirth"
                name="dateOfBirth"
                value={selectedDate ? format(selectedDate, 'PP') : ''}
                onClick={() => isEditing && setShowCalendar(!showCalendar)}
                readOnly
                disabled={!isEditing}
                className="cursor-pointer"
              />
              {showCalendar && isEditing && (
                <div className="absolute z-10 bg-white border rounded-md shadow-md mt-1">
                  <EnhancedCalendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    initialFocus
                  />
                </div>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select
              disabled={!isEditing}
              value={formData.gender}
              onValueChange={handleGenderChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-4">
          {isEditing ? (
            <>
              <Button variant="outline" onClick={() => {
                setIsEditing(false);
                setShowCalendar(false);
              }}>
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
  );
} 