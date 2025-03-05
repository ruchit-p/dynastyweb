"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Camera, Loader2 } from "lucide-react"
import { useAuth } from "@/context/AuthContext"
import { useToast } from "@/components/ui/use-toast"
import { doc, updateDoc, serverTimestamp, FieldValue } from "firebase/firestore"
import { db, storage } from "@/lib/firebase"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"

// MARK: - Helper Constants
const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

export default function PersonalInformationPage() {
  const { currentUser, firestoreUser, refreshFirestoreUser } = useAuth()
  const { toast } = useToast()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [newProfilePicture, setNewProfilePicture] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    gender: ""
  })
  const [dobData, setDobData] = useState({
    day: "",
    month: "",
    year: ""
  })

  // Generate arrays for days and years
  const getDaysInMonth = (month: number, year: number): number[] => {
    const daysInMonth = new Date(year, month, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => i + 1);
  }

  const days = dobData.month && dobData.year 
    ? getDaysInMonth(parseInt(dobData.month), parseInt(dobData.year)) 
    : Array.from({ length: 31 }, (_, i) => i + 1);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  // Format date from Firestore Date object to our day/month/year selections
  const formatDateForInputs = (date: Date | null | undefined) => {
    if (!date) return { day: "", month: "", year: "" };
    try {
      // Handle both native Date objects and Firestore Timestamp objects
      let jsDate;
      if (typeof date === 'object' && date !== null && 'toDate' in date && typeof date.toDate === 'function') {
        // If it's a Firestore Timestamp object
        jsDate = date.toDate();
      } else {
        // If it's already a Date or can be converted to one
        jsDate = date instanceof Date ? date : new Date(date);
      }
      
      return {
        day: jsDate.getDate().toString(),
        month: (jsDate.getMonth() + 1).toString(),
        year: jsDate.getFullYear().toString()
      };
    } catch (e) {
      console.error("Error formatting date:", e);
      return { day: "", month: "", year: "" };
    }
  };

  useEffect(() => {
    if (firestoreUser) {
      setFormData({
        firstName: firestoreUser.firstName,
        lastName: firestoreUser.lastName,
        phoneNumber: firestoreUser.phoneNumber || "",
        gender: firestoreUser.gender || ""
      })
      
      setDobData(formatDateForInputs(firestoreUser.dateOfBirth));
    }
  }, [firestoreUser])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDobChange = (field: "day" | "month" | "year", value: string) => {
    setDobData((prev: {day: string, month: string, year: string}) => ({ ...prev, [field]: value }));
    
    // If month changed, make sure day is valid for the new month
    if (field === "month" || field === "year") {
      const newMonth = field === "month" ? parseInt(value) : parseInt(dobData.month);
      const newYear = field === "year" ? parseInt(value) : parseInt(dobData.year);
      
      if (newMonth && newYear) {
        const daysInNewMonth = new Date(newYear, newMonth, 0).getDate();
        const currentDay = parseInt(dobData.day);
        
        if (currentDay > daysInNewMonth) {
          setDobData((prev: {day: string, month: string, year: string}) => ({ ...prev, day: daysInNewMonth.toString() }));
        }
      }
    }
  };

  const handleProfilePictureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setNewProfilePicture(e.target.files[0])
    }
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

      // Parse date of birth into Date object if all parts exist
      let dateOfBirth = null
      if (dobData.day && dobData.month && dobData.year) {
        // JavaScript months are 0-indexed, so subtract 1 from month
        dateOfBirth = new Date(
          parseInt(dobData.year),
          parseInt(dobData.month) - 1,
          parseInt(dobData.day)
        );
      }

      // Prepare update data
      const updateData: Partial<{
        firstName: string;
        lastName: string;
        phoneNumber: string | null;
        dateOfBirth: Date | null;
        gender: string | null;
        displayName: string;
        updatedAt: FieldValue;
        profilePicture?: string;
      }> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        phoneNumber: formData.phoneNumber,
        dateOfBirth: dateOfBirth,
        gender: formData.gender,
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
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#0A5C36]" />
      </div>
    )
  }

  // Format DOB for display in read-only mode
  const formatDobForDisplay = () => {
    if (!dobData.day || !dobData.month || !dobData.year) return "Not set";
    
    const monthName = MONTHS.find(m => m.value === dobData.month)?.label || "";
    return `${monthName} ${dobData.day}, ${dobData.year}`;
  };

  return (
    <>
      <h1 className="text-2xl font-bold mb-6 text-[#0A5C36]">Personal Information</h1>
      
      <div className="space-y-6">
        {/* Profile picture section */}
        <div className="flex flex-col items-center sm:flex-row sm:items-start gap-6 pb-6 border-b border-gray-200">
          <div className="relative">
            <div className="relative h-24 w-24 rounded-full overflow-hidden border-4 border-[#F9FAFB]">
              <Image
                src={newProfilePicture ? URL.createObjectURL(newProfilePicture) : firestoreUser.profilePicture || "/avatar.svg"}
                alt="Profile"
                fill
                className="object-cover"
              />
            </div>
            {isEditing && (
              <div className="absolute bottom-0 right-0">
                <label
                  htmlFor="profile-upload"
                  className="flex items-center justify-center h-8 w-8 rounded-full bg-[#0A5C36] text-white cursor-pointer shadow-md"
                >
                  <Camera className="h-4 w-4" />
                  <input
                    id="profile-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfilePictureChange}
                  />
                </label>
              </div>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-1">
              {firestoreUser.firstName} {firestoreUser.lastName}
            </h2>
            <p className="text-gray-500 mb-4">{firestoreUser.email}</p>
            <p className="text-sm text-gray-600">
              Your profile picture and personal details will be visible to family members.
            </p>
          </div>
        </div>

        {/* Form fields */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
          
          {/* Date of Birth - three dropdown fields */}
          <div>
            <Label htmlFor="dateOfBirth">Date of Birth</Label>
            {isEditing ? (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Select 
                    value={dobData.month} 
                    onValueChange={(value) => handleDobChange("month", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Month" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((month) => (
                        <SelectItem key={month.value} value={month.value}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select 
                    value={dobData.day} 
                    onValueChange={(value) => handleDobChange("day", value)}
                    disabled={!dobData.month || !dobData.year}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      {days.map((day) => (
                        <SelectItem key={day} value={day.toString()}>
                          {day}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Select 
                    value={dobData.year} 
                    onValueChange={(value) => handleDobChange("year", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <Input
                value={formatDobForDisplay()}
                disabled={true}
              />
            )}
          </div>
          
          <div>
            <Label htmlFor="gender">Gender</Label>
            {isEditing ? (
              <Select 
                value={formData.gender} 
                onValueChange={(value) => handleSelectChange("gender", value)}
                disabled={!isEditing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="non-binary">Non-binary</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="gender"
                name="gender"
                value={formData.gender === "prefer-not-to-say" 
                  ? "Prefer not to say" 
                  : formData.gender.charAt(0).toUpperCase() + formData.gender.slice(1) || ""}
                disabled={true}
              />
            )}
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
    </>
  )
} 