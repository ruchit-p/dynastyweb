import { useState } from "react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AlertCircle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { FamilyMemberSelect } from "@/components/FamilyMemberSelect"

type StoryPrivacyType = 'family' | 'personal' | 'custom'

interface StoryPrivacySettingsProps {
  privacy: StoryPrivacyType
  customAccessMembers?: string[]
  onPrivacyChange: (privacy: StoryPrivacyType) => void
  onCustomMembersChange: (members: string[]) => void
  isUpdating?: boolean
}

export function StoryPrivacySettings({
  privacy,
  customAccessMembers = [],
  onPrivacyChange,
  onCustomMembersChange,
  isUpdating = false
}: StoryPrivacySettingsProps) {
  const [selectedPrivacy, setSelectedPrivacy] = useState<StoryPrivacyType>(privacy)
  
  const handlePrivacyChange = (value: StoryPrivacyType) => {
    setSelectedPrivacy(value)
    onPrivacyChange(value)
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Story Privacy</CardTitle>
        <CardDescription>
          Control who can see this story
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedPrivacy}
          onValueChange={(value) => handlePrivacyChange(value as StoryPrivacyType)}
          className="space-y-4"
        >
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="family" id="family-privacy" className="mt-1" />
            <div className="grid gap-1.5">
              <Label htmlFor="family-privacy" className="font-medium">Family</Label>
              <p className="text-sm text-gray-500">
                All family members can see this story.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="personal" id="personal-privacy" className="mt-1" />
            <div className="grid gap-1.5">
              <Label htmlFor="personal-privacy" className="font-medium">Personal</Label>
              <p className="text-sm text-gray-500">
                Only you can see this story.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="custom" id="custom-privacy" className="mt-1" />
            <div className="grid gap-1.5">
              <Label htmlFor="custom-privacy" className="font-medium">Custom</Label>
              <p className="text-sm text-gray-500">
                Only selected family members can see this story.
              </p>
            </div>
          </div>
        </RadioGroup>
        
        {selectedPrivacy === 'custom' && (
          <div className="mt-4 space-y-2">
            <Label>Select family members</Label>
            <FamilyMemberSelect
              selectedMembers={customAccessMembers}
              onMemberSelect={onCustomMembersChange}
              placeholder="Select family members who can see this story"
            />
            {customAccessMembers.length === 0 && (
              <p className="text-sm text-red-500">Please select at least one family member</p>
            )}
          </div>
        )}
        
        {selectedPrivacy !== privacy && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Changing privacy settings will affect who can see your story.
            </AlertDescription>
          </Alert>
        )}
        
        {isUpdating && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900"></div>
            <p className="text-sm">Updating privacy settings...</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 