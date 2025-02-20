import React from 'react'
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { familyNames } from "@/data/familyData"

interface FamilyMemberSelectProps {
  selectedMembers: string[]
  onMemberSelect: (members: string[]) => void
  placeholder?: string
  className?: string
}

export function FamilyMemberSelect({
  selectedMembers,
  onMemberSelect,
  placeholder = "Select family members",
  className
}: FamilyMemberSelectProps) {
  const [open, setOpen] = React.useState(false)

  const familyMembersList = Object.entries(familyNames).map(([id, name]) => ({
    value: id,
    label: name
  }))

  const toggleMember = (value: string) => {
    const newSelection = selectedMembers.includes(value)
      ? selectedMembers.filter(id => id !== value)
      : [...selectedMembers, value]
    onMemberSelect(newSelection)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {selectedMembers.length > 0
            ? `${selectedMembers.length} member${selectedMembers.length === 1 ? '' : 's'} selected`
            : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search family members..." />
          <CommandList>
            <CommandEmpty>No family member found.</CommandEmpty>
            <CommandGroup>
              {familyMembersList.map((member) => (
                <CommandItem
                  key={member.value}
                  value={member.value}
                  onSelect={() => toggleMember(member.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedMembers.includes(member.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {member.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 