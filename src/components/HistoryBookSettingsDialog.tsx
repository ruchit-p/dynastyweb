import { useState } from "react"
import { Button } from "@/components/ui/button"
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { Settings, X } from "lucide-react"
import { HistoryBookPrivacySettings } from "@/components/HistoryBookPrivacySettings"
import type { HistoryBookPrivacyLevel } from "@/lib/shared/types/story"

interface HistoryBookSettingsDialogProps {
  privacyLevel: HistoryBookPrivacyLevel
  onPrivacyChange: (privacyLevel: HistoryBookPrivacyLevel) => void
  customAccessMembers: string[]
  onCustomAccessChange: (members: string[]) => void
  isUpdating: boolean
}

export function HistoryBookSettingsDialog({
  privacyLevel,
  onPrivacyChange,
  customAccessMembers,
  onCustomAccessChange,
  isUpdating
}: HistoryBookSettingsDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md md:max-w-2xl">
        <DialogHeader className="flex flex-row items-center justify-between">
          <div>
            <DialogTitle>History Book Settings</DialogTitle>
            <DialogDescription>
              Configure privacy and access settings for your history book
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
              <span className="sr-only">Close</span>
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        
        <div className="my-6">
          <HistoryBookPrivacySettings
            privacyLevel={privacyLevel}
            onPrivacyChange={(newPrivacyLevel) => {
              onPrivacyChange(newPrivacyLevel)
              // We'll keep the dialog open to allow users to see the changes
            }}
            customAccessMembers={customAccessMembers}
            onCustomAccessChange={onCustomAccessChange}
            isUpdating={isUpdating}
            inDialog={true}
          />
        </div>
        
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 