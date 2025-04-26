"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  // Add other step properties if needed, e.g., icon, description
}

interface StepperProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: Step[];
  currentStep: number; // 0-based index
}

const Stepper = React.forwardRef<HTMLDivElement, StepperProps>(
  ({ className, steps, currentStep, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex items-center justify-between w-full", className)}
        {...props}
      >
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;

          return (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2",
                    isCompleted
                      ? "bg-primary border-primary text-primary-foreground"
                      : isActive
                      ? "border-primary text-primary"
                      : "border-muted-foreground text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                      stroke="currentColor"
                      className="w-5 h-5"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "mt-2 text-xs text-center",
                    isActive ? "text-primary font-semibold" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-4",
                    isCompleted ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  }
);
Stepper.displayName = "Stepper";

export { Stepper };
export type { Step as StepperStep }; // Export Step type as StepperStep
