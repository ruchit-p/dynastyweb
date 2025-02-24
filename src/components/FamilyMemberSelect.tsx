import React, { useEffect, useState } from 'react'
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/lib/shared/types/supabase'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui/spinner'

interface FamilyMember {
  id: string
  displayName: string
}

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
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([])
  const { user } = useAuth()
  const supabase = createClientComponentClient<Database>()

  useEffect(() => {
    const fetchFamilyMembers = async () => {
      if (!user) return

      try {
        setLoading(true)

        // First get the user's family tree ID
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('family_tree_id')
          .eq('id', user.id)
          .single()

        if (userError) throw userError
        if (!userData?.family_tree_id) {
          console.error('No family tree ID found')
          return
        }

        // Get the family tree members
        const { data: familyTreeData, error: treeError } = await supabase
          .from('family_trees')
          .select(`
            members,
            users:members(
              id,
              full_name,
              first_name,
              last_name
            )
          `)
          .eq('id', userData.family_tree_id)
          .single()

        if (treeError) throw treeError
        if (!familyTreeData?.users) {
          console.error('No family tree members found')
          return
        }

        // Transform user data into FamilyMember format
        const members = familyTreeData.users.map(user => ({
          id: user.id,
          displayName: user.full_name || `${user.first_name} ${user.last_name}`.trim()
        }))

        setFamilyMembers(members)
      } catch (error) {
        console.error('Error fetching family members:', error)
      } finally {
        setLoading(false)
      }
    }

    void fetchFamilyMembers()
  }, [user, supabase])

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
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Spinner className="h-4 w-4" />
                </div>
              ) : (
                familyMembers.map((member) => (
                  <CommandItem
                    key={member.id}
                    value={member.id}
                    onSelect={() => toggleMember(member.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selectedMembers.includes(member.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {member.displayName}
                  </CommandItem>
                ))
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
} 