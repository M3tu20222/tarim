"use client";

import { useFormContext } from "react-hook-form";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PartnerDueDateProps {
  index: number;
}

export function PartnerDueDate({ index }: PartnerDueDateProps) {
  const form = useFormContext();
  const hasPaid = form.watch(`partners.${index}.hasPaid`);

  if (hasPaid) {
    return null;
  }

  return (
    <FormField
      control={form.control}
      name={`partners.${index}.dueDate`}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>Vade Tarihi</FormLabel>
          <Popover>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={"outline"}
                  className={`w-full pl-3 text-left font-normal ${
                    !field.value ? "text-muted-foreground" : ""
                  }`}
                >
                  {field.value ? (
                    format(field.value, "PPP", { locale: tr })
                  ) : (
                    <span>Tarih seçin</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={field.value}
                onSelect={field.onChange}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
