import { useState } from "react"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { AlertCircle, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import type { HistoryBookPrivacyLevel } from "@/lib/shared/types/story"
import { FamilyMemberSelect } from "./FamilyMemberSelect"

interface HistoryBookPrivacySettingsProps {
  privacyLevel: HistoryBookPrivacyLevel
  onPrivacyChange: (privacyLevel: HistoryBookPrivacyLevel) => void
  customAccessMembers?: string[]
  onCustomAccessChange?: (members: string[]) => void
  isUpdating?: boolean
}

export function HistoryBookPrivacySettings({
  privacyLevel,
  onPrivacyChange,
  customAccessMembers = [],
  onCustomAccessChange,
  isUpdating = false
}: HistoryBookPrivacySettingsProps) {
  const [selectedPrivacy, setSelectedPrivacy] = useState<HistoryBookPrivacyLevel>(privacyLevel)
  
  const handlePrivacyChange = (value: HistoryBookPrivacyLevel) => {
    setSelectedPrivacy(value)
    onPrivacyChange(value)
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>History Book Privacy</CardTitle>
        <CardDescription>
          Control who can access your history book and its stories
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <RadioGroup
          value={selectedPrivacy}
          onValueChange={(value) => handlePrivacyChange(value as HistoryBookPrivacyLevel)}
          className="space-y-4"
        >
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="family" id="family" className="mt-1" />
            <div className="grid gap-1.5">
              <Label htmlFor="family" className="font-medium">Family</Label>
              <p className="text-sm text-gray-500">
                The history book is publicly open to family members. Story privacy is set per story and supercedes this setting.
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <RadioGroupItem value="personal" id="personal" className="mt-1" />
            <div className="grid gap-1.5">
              <Label htmlFor="personal" className="font-medium">Personal</Label>
              <p className="text-sm text-gray-500">
                History book is closed to only you. All stories will be private regardless of individual story settings.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <RadioGroupItem value="custom" id="custom" className="mt-1" />
            <div className="grid gap-1.5 w-full">
              <Label htmlFor="custom" className="font-medium">Custom</Label>
              <p className="text-sm text-gray-500">
                Specify exactly which family members can access this history book. Custom settings per story can further restrict access.
              </p>
              
              {selectedPrivacy === 'custom' && onCustomAccessChange && (
                <div className="mt-3 border rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">Select Family Members</span>
                  </div>
                  <FamilyMemberSelect 
                    selectedMembers={customAccessMembers}
                    onMemberSelect={onCustomAccessChange}
                  />
                </div>
              )}
            </div>
          </div>
        </RadioGroup>
        
        {selectedPrivacy !== privacyLevel && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              Changing privacy settings will affect who can see your history book and its stories.
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