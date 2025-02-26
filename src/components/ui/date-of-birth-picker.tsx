import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { EnhancedCalendar } from "@/components/ui/enhanced-calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface DateOfBirthPickerProps {
  value: Date | undefined;
  onChange: (value: Date | undefined) => void;
  error?: string;
  label?: string;
  id?: string;
  className?: string;
  minAge?: number;
}

/**
 * A reusable date of birth picker component that uses the EnhancedCalendar
 * Can be used in any form that requires date of birth selection
 */
export function DateOfBirthPicker({
  value,
  onChange,
  error,
  label = "Date of birth",
  id = "dateOfBirth",
  className,
  minAge = 13, // Default minimum age is 13
}: DateOfBirthPickerProps) {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label htmlFor={id}>{label}</Label>}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground",
              error && "border-red-500"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, 'PPP') : 'Select your date of birth'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <EnhancedCalendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            disabled={(date) => {
              const today = new Date();
              const birthDate = new Date(date);
              
              let age = today.getFullYear() - birthDate.getFullYear();
              const monthDiff = today.getMonth() - birthDate.getMonth();
              
              // Adjust age if birthday hasn't occurred this year
              if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                age--;
              }
              
              return age < minAge;
            }}
          />
        </PopoverContent>
      </Popover>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
} 