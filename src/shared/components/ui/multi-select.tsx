"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

// Düzeltildi: Omit kullanarak onChange çakışması çözüldü
interface MultiSelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: { label: string; value: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}

const MultiSelect = React.forwardRef<HTMLSelectElement, MultiSelectProps>(
  ({ className, options, value, onChange, ...props }, ref) => {
    return (
      <select
        multiple
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&:has([aria-selected=true])]:outline-none",
          className
        )}
        value={value}
        onChange={(e) => {
          const selectedOptions: string[] = [];
          for (let i = 0; i < e.target.options.length; i++) {
            const option = e.target.options[i];
            if (option.selected) {
              selectedOptions.push(option.value);
            }
          }
          onChange(selectedOptions);
        }}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);
MultiSelect.displayName = "MultiSelect";

export { MultiSelect };
