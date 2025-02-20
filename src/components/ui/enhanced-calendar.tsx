'use client';

import * as React from 'react';
import { DayPicker, DayPickerSingleProps } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// MARK: - Helper Functions
const getYearRange = (currentYear: number): number[] => {
  const years: number[] = [];
  // Show 100 years before and after current year
  for (let year = currentYear - 100; year <= currentYear + 100; year++) {
    years.push(year);
  }
  return years;
};

const months = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// MARK: - Component
export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function EnhancedCalendar({
  className,
  classNames,
  showOutsideDays = true,
  selected,
  mode = "single",
  ...props
}: DayPickerSingleProps) {
  const currentDate = new Date();
  const years = getYearRange(currentDate.getFullYear());
  
  // Initialize month state with selected date if available, otherwise use defaultMonth or current date
  const [month, setMonth] = React.useState<Date>(() => {
    if (selected instanceof Date) {
      return selected;
    }
    return props.defaultMonth || currentDate;
  });

  // Update month when selected date changes
  React.useEffect(() => {
    if (selected instanceof Date) {
      setMonth(selected);
    }
  }, [selected]);

  return (
    <DayPicker
      mode={mode}
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      month={month}
      selected={selected}
      classNames={{
        months: 'flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0',
        month: 'space-y-4',
        caption: 'flex justify-center pt-1 relative items-center gap-1',
        caption_label: 'hidden', // Hide the default caption label
        nav: 'space-x-1 flex items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100'
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell:
          'text-slate-500 rounded-md w-9 font-normal text-[0.8rem] dark:text-slate-400',
        row: 'flex w-full mt-2',
        cell: 'h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-slate-100/50 [&:has([aria-selected])]:bg-slate-100 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20 dark:[&:has([aria-selected].day-outside)]:bg-slate-800/50 dark:[&:has([aria-selected])]:bg-slate-800',
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100'
        ),
        day_range_end: 'day-range-end',
        day_selected:
          'bg-slate-900 text-slate-50 hover:bg-slate-900 hover:text-slate-50 focus:bg-slate-900 focus:text-slate-50 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-50 dark:hover:text-slate-900 dark:focus:bg-slate-50 dark:focus:text-slate-900',
        day_today: 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50',
        day_outside:
          'day-outside text-slate-500 opacity-50 aria-selected:bg-slate-100/50 aria-selected:text-slate-500 aria-selected:opacity-30 dark:text-slate-400 dark:aria-selected:bg-slate-800/50 dark:aria-selected:text-slate-400',
        day_disabled: 'text-slate-500 opacity-50 dark:text-slate-400',
        day_range_middle:
          'aria-selected:bg-slate-100 aria-selected:text-slate-900 dark:aria-selected:bg-slate-800 dark:aria-selected:text-slate-50',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Caption: ({ displayMonth }) => {
          return (
            <div className="flex justify-center items-center gap-2">
              <Select
                value={displayMonth.getMonth().toString()}
                onValueChange={(value) => {
                  const newDate = new Date(displayMonth);
                  newDate.setMonth(parseInt(value));
                  setMonth(newDate);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue>
                    {months[displayMonth.getMonth()]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {months.map((month, index) => (
                    <SelectItem key={month} value={index.toString()}>
                      {month}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={displayMonth.getFullYear().toString()}
                onValueChange={(value) => {
                  const newDate = new Date(displayMonth);
                  newDate.setFullYear(parseInt(value));
                  setMonth(newDate);
                }}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue>
                    {displayMonth.getFullYear()}
                  </SelectValue>
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
          );
        },
      }}
      onMonthChange={setMonth}
      {...props}
    />
  );
}
EnhancedCalendar.displayName = 'EnhancedCalendar';

export { EnhancedCalendar }; 